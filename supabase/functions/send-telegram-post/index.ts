import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramPost {
  id: string;
  user_id: string;
  channel_id: string | null;
  content: string;
  image_url: string | null;
  status: string;
  telegram_chat_id: string | null;
  channels: {
    telegram_bot_token: string | null;
    telegram_channel_id: string | null;
  } | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let postId: string | undefined;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    postId = body.postId;

    if (!postId) {
      return new Response(
        JSON.stringify({ error: 'Post ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing post: ${postId}`);

    // Get the post details with channel info
    const { data, error: postError } = await supabase
      .from('telegram_posts')
      .select('*, channels(telegram_bot_token, telegram_channel_id)')
      .eq('id', postId)
      .single();

    if (postError || !data) {
      console.error('Failed to fetch post:', postError);
      return new Response(
        JSON.stringify({ error: 'Post not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const post = data as unknown as TelegramPost;

    // Get bot token - prefer channel-specific token, fallback to environment
    const botToken = post.channels?.telegram_bot_token || Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = post.channels?.telegram_channel_id || post.telegram_chat_id;

    if (!botToken) {
      console.error('No bot token configured');
      await supabase.from('telegram_posts').update({
        status: 'failed',
        error_message: 'No Telegram bot token configured. Add it in channel settings.',
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>).eq('id', postId);
      return new Response(
        JSON.stringify({ error: 'No Telegram bot token configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!chatId) {
      console.error('No chat ID configured');
      await supabase.from('telegram_posts').update({
        status: 'failed',
        error_message: 'No Telegram channel ID configured. Add it in channel settings.',
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>).eq('id', postId);
      return new Response(
        JSON.stringify({ error: 'No Telegram channel ID configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending post to Telegram chat: ${chatId}`);

    let telegramResponse;

    // Check if post has an image
    if (post.image_url) {
      // Send photo with caption
      const photoUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
      telegramResponse = await fetch(photoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: post.image_url,
          caption: post.content || '',
          parse_mode: 'HTML',
        }),
      });
    } else {
      // Send text message
      const messageUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      telegramResponse = await fetch(messageUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: post.content,
          parse_mode: 'HTML',
        }),
      });
    }

    const telegramResult = await telegramResponse.json();
    console.log('Telegram API response:', JSON.stringify(telegramResult));

    if (!telegramResult.ok) {
      const errorMessage = handleTelegramError(telegramResult);
      console.error('Telegram API error:', errorMessage);
      await supabase.from('telegram_posts').update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>).eq('id', postId);
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const telegramMessageId = telegramResult.result?.message_id?.toString();
    console.log(`Post sent successfully. Message ID: ${telegramMessageId}`);

    // Update post status to posted
    const { error: updateError } = await supabase
      .from('telegram_posts')
      .update({ 
        status: 'posted', 
        posted_at: new Date().toISOString(),
        telegram_message_id: telegramMessageId,
        telegram_chat_id: chatId,
        error_message: null,
        updated_at: new Date().toISOString()
      } as Record<string, unknown>)
      .eq('id', postId);

    if (updateError) {
      console.error('Failed to update post status:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: telegramMessageId,
        posted_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-telegram-post:', error);
    
    // Update status to failed if we have postId
    if (postId) {
      try {
        await supabase.from('telegram_posts').update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>).eq('id', postId);
      } catch (updateErr) {
        console.error('Failed to update post status:', updateErr);
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to handle Telegram API errors
function handleTelegramError(errorData: { error_code?: number; description?: string }): string {
  if (errorData.error_code === 403) {
    return `Bot Access Error: Your bot is not an admin of this channel. Please add your bot as Administrator with 'Post Messages' permission.`;
  } else if (errorData.error_code === 400 && errorData.description?.includes('chat not found')) {
    return `Chat Not Found: The channel ID is incorrect. For private channels use format: -100xxxxxxxxxx`;
  } else if (errorData.error_code === 400 && errorData.description?.includes('wrong file identifier')) {
    return `Invalid Media: The image URL is invalid or expired. Please re-upload the image.`;
  }
  return `Telegram Error: ${errorData.description || "Unknown error"}`;
}
