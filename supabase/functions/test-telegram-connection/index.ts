import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeUserFacingAi, classifyBearer, extractBearer } from '../_shared/auth.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const classified = classifyBearer({
      authorizationHeader: req.headers.get('Authorization'),
      cronSecretHeader: req.headers.get('x-cron-secret'),
      cronSecret: Deno.env.get('CRON_SECRET'),
      serviceRoleKey,
    });
    let callerUserId: string | null = null;
    if (classified === 'user-or-unknown') {
      const supabase = createClient(supabaseUrl, supabaseAnon);
      const { data: { user }, error: authError } = await supabase.auth.getUser(extractBearer(req.headers.get('Authorization')));
      if (!authError && user) callerUserId = user.id;
    }
    if (authorizeUserFacingAi({ classified, callerUserId }) !== 'allow') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const user = { id: callerUserId as string };

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
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    let TELEGRAM_BOT_TOKEN: string | null = typeof botToken === 'string' && botToken.trim() ? botToken.trim() : null;

    if (channelId && !TELEGRAM_BOT_TOKEN) {
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

      if (channel.user_id !== user.id) {
        console.error(`Security violation: User ${user.id} tried to test channel ${channelId} owned by ${channel.user_id}`);
        return new Response(
          JSON.stringify({ success: false, error: 'You do not have permission to test this channel' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      TELEGRAM_BOT_TOKEN = channel.telegram_bot_token;
    }

    if (!TELEGRAM_BOT_TOKEN) {
      const { data: botChannel } = await supabaseAdmin
        .from('channels')
        .select('telegram_bot_token')
        .eq('user_id', user.id)
        .not('telegram_bot_token', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (botChannel) TELEGRAM_BOT_TOKEN = botChannel.telegram_bot_token;
    }

    const { data: isSuperAdmin } = await supabaseAdmin.rpc('is_super_admin', { p_user_id: user.id });
    if (!TELEGRAM_BOT_TOKEN && isSuperAdmin === true) {
      TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || Deno.env.get("ADMIN_BOT_TOKEN") || null;
    }

    const adminBotToken = Deno.env.get("ADMIN_BOT_TOKEN");
    if (adminBotToken && TELEGRAM_BOT_TOKEN === adminBotToken && isSuperAdmin !== true) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This bot is for administrative use only. Please add your own Telegram bot token to your channel in the 'Channels' page."
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
