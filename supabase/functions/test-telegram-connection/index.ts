import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { chatId, channelId, botToken } = await req.json();

    // Input validation
    if (!chatId) {
      return new Response(
        JSON.stringify({ success: false, error: "Chat ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate chatId format (prevent injection)
    const chatIdStr = String(chatId);
    const chatIdRegex = /^(@[a-zA-Z0-9_]{5,32}|-?[0-9]{1,20})$/;
    if (!chatIdRegex.test(chatIdStr)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid chat ID format. Use @username or numeric ID.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get bot token from channel with ownership verification
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    let TELEGRAM_BOT_TOKEN: string | null = botToken || null;

    if (channelId && !TELEGRAM_BOT_TOKEN) {
      // Verify user owns this channel and get its bot token
      const { data: channel, error: channelError } = await supabaseAdmin
        .from('channels')
        .select('id, user_id, telegram_bot_token')
        .eq('id', channelId)
        .single();

      if (channelError || !channel) {
        return new Response(
          JSON.stringify({ success: false, error: 'Channel not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // SECURITY: Verify ownership
      if (channel.user_id !== user.id) {
        console.error(`Security violation: User ${user.id} tried to test channel ${channelId} owned by ${channel.user_id}`);
        return new Response(
          JSON.stringify({ success: false, error: 'You do not have permission to test this channel' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      TELEGRAM_BOT_TOKEN = channel.telegram_bot_token;
    }

    // FALLBACK: If specific channel has no token (or no channelId provided), 
    // look for ANY channel with a bot token owned by the user
    if (!TELEGRAM_BOT_TOKEN) {
      console.log(`Searching for fallback bot token for user ${user.id}...`);
      const { data: botChannel } = await supabaseAdmin
        .from('channels')
        .select('telegram_bot_token')
        .eq('user_id', user.id)
        .not('telegram_bot_token', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (botChannel) {
        TELEGRAM_BOT_TOKEN = botChannel.telegram_bot_token;
        console.log("Using fallback bot token from another channel.");
      }
    }

    // Fallback to global token as extreme last resort (though we want to move away from this)
    if (!TELEGRAM_BOT_TOKEN) {
      TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || null;
    }

    // SECURITY: Restrict specific administrative bot token to super admins only
    const ADMIN_BOT_TOKEN = "8478847750:AAF58NI0nqfxEzEqe7npy9s0CwEJN9PuX4k";
    if (TELEGRAM_BOT_TOKEN === ADMIN_BOT_TOKEN) {
      console.log(`Checking if user ${user.id} has super admin permissions to use the admin bot token...`);
      const { data: isSuperAdmin } = await supabaseAdmin.rpc('is_super_admin', { p_user_id: user.id });

      if (!isSuperAdmin) {
        console.warn(`Access denied: Non-admin user ${user.id} attempted to use administrative bot token.`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "This bot is for administrative use only. Please add your own Telegram bot token to your channel in the 'Channels' page."
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`Access granted: Super admin ${user.id} is using the administrative bot token.`);
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No bot token configured. Please add a Telegram bot token to your channel."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // Try to get chat info to verify access
    const response = await fetch(`${baseUrl}/getChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatIdStr }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Telegram API error for user:", user.id);

      if (data.error_code === 400 && data.description?.includes('chat not found')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Chat not found. Please verify:\n1. The chat ID is correct\n2. Your bot has been added to this chat\n3. For channels: Use format -100xxxxxxxxxx`
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (data.error_code === 403) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Bot not authorized. Please:\n1. Open your Telegram Channel\n2. Manage Channel > Administrators\n3. Add your bot as an Admin\n4. Ensure 'Post Messages' permission is ON.`
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to connect. Please check your chat ID and try again."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success - bot can access the chat
    const chatType = data.result?.type || "unknown";
    const chatTitle = data.result?.title || data.result?.username || "Chat";

    console.log(`Connection test successful for user ${user.id} to ${chatType}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Connected to ${chatType}: ${chatTitle}`,
        chatInfo: {
          type: chatType,
          title: chatTitle,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Test connection error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Connection test failed. Please try again."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
