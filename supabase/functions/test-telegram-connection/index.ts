import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatId } = await req.json();
    
    if (!chatId) {
      return new Response(
        JSON.stringify({ success: false, error: "Chat ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Bot token is not configured. Please add TELEGRAM_BOT_TOKEN in your secrets." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    
    // Try to get chat info to verify access
    const response = await fetch(`${baseUrl}/getChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Telegram API error:", data);
      
      if (data.error_code === 400 && data.description?.includes('chat not found')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Chat not found. The chat ID "${chatId}" doesn't exist. Please verify:\n1. The chat ID is correct\n2. Your bot has been added to this chat\n3. For channels: Use format -100xxxxxxxxxx`
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (data.error_code === 403) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Bot not authorized. Please add your bot to the chat/channel and grant it permission to post messages.`
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.description || "Unknown error from Telegram API"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success - bot can access the chat
    const chatType = data.result?.type || "unknown";
    const chatTitle = data.result?.title || data.result?.username || chatId;
    
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
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
