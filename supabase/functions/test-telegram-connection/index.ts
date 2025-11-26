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

    const { chatId } = await req.json();

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

    // SECURITY: Only use server-side bot token - never accept from client
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Bot not configured. Please contact support."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
            error: `Bot not authorized. Please add the bot to the chat/channel and grant it permission to post messages.`
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
