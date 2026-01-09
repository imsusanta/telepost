import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { postId } = await req.json();

    if (!postId) {
      return new Response(
        JSON.stringify({ error: 'Post ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing post: ${postId}`);

    // Get the post details
    const { data: post, error: postError } = await supabase
      .from('telegram_posts')
      .select('*, channels(*)')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('Failed to fetch post:', postError);
      return new Response(
        JSON.stringify({ error: 'Post not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get bot token from channel settings
    const channel = post.channels;
    const botToken = channel?.telegram_bot_token;
    const chatId = channel?.telegram_channel_id || post.telegram_chat_id;

    if (!botToken) {
      console.error('No bot token configured for channel');
      await supabase
        .from('telegram_posts')
        .update({ 
          status: 'failed', 
          error_message: 'No Telegram bot token configured',
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      return new Response(
        JSON.stringify({ error: 'No Telegram bot token configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!chatId) {
      console.error('No chat ID configured');
      await supabase
        .from('telegram_posts')
        .update({ 
          status: 'failed', 
          error_message: 'No Telegram channel ID configured',
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      return new Response(
        JSON.stringify({ error: 'No Telegram channel ID configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending post to Telegram chat: ${chatId}`);

    let telegramResponse;
    let telegramMessageId;

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
          caption: post.content,
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
      console.error('Telegram API error:', telegramResult.description);
      await supabase
        .from('telegram_posts')
        .update({ 
          status: 'failed', 
          error_message: telegramResult.description || 'Failed to send to Telegram',
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      return new Response(
        JSON.stringify({ error: telegramResult.description || 'Failed to send to Telegram' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    telegramMessageId = telegramResult.result?.message_id?.toString();
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
      })
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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
