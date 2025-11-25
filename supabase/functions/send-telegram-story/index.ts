import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TextOverlay {
  text: string;
  fontSize: number;
  fontWeight?: string;
  color: string;
  position: { x: number; y: number };
  align?: string;
}

interface TelegramStoryRequest {
  storyId: string;
  instantPost?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storyId, instantPost = false }: TelegramStoryRequest = await req.json();

    if (!storyId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: storyId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch story data
    const { data: story, error: storyError } = await supabase
      .from('telegram_stories')
      .select(`
        *,
        channels (
          telegram_channel_id
        )
      `)
      .eq('story_id', storyId)
      .single();

    if (storyError || !story) {
      throw new Error(`Story not found: ${storyError?.message}`);
    }

    // Check if story is ready to post
    if (!instantPost && story.status !== 'scheduled') {
      throw new Error(`Story status must be 'scheduled' to post (current: ${story.status})`);
    }

    if (instantPost && story.status !== 'draft' && story.status !== 'scheduled') {
      throw new Error(`Can only instantly post stories with 'draft' or 'scheduled' status (current: ${story.status})`);
    }

    // Get bot token from environment (server-side only)
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      throw new Error("Bot token not configured. Please add TELEGRAM_BOT_TOKEN to secrets.");
    }

    const chatId = story.channels?.telegram_channel_id;
    if (!chatId) {
      throw new Error("Chat ID not configured. Please add your Telegram channel ID in channel settings.");
    }

    // Validate chat ID format for private channels
    if (!chatId.startsWith('@') && !chatId.startsWith('-')) {
      throw new Error(`Invalid chat ID format: "${chatId}". For private channels use: -100xxxxxxxxxx, for public channels use: @channelname`);
    }

    const baseUrl = `https://api.telegram.org/bot${botToken}`;
    let messageId: string | null = null;
    let postSuccess = false;

    // Send story based on media type
    if (story.media_type === 'image') {
      // Send photo story
      const caption = buildCaption(story);

      const photoResponse = await fetch(`${baseUrl}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: story.media_url,
          caption: caption,
          parse_mode: "Markdown",
        }),
      });

      const photoData = await photoResponse.json();

      if (!photoResponse.ok) {
        throw new Error(handleTelegramError(photoData));
      }

      messageId = photoData.result?.message_id?.toString();
      postSuccess = true;

    } else if (story.media_type === 'video') {
      // Send video story
      const caption = buildCaption(story);

      const videoResponse = await fetch(`${baseUrl}/sendVideo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          video: story.media_url,
          caption: caption,
          parse_mode: "Markdown",
          duration: story.duration_hours ? story.duration_hours * 3600 : 60, // Default 60 seconds
          supports_streaming: true,
        }),
      });

      const videoData = await videoResponse.json();

      if (!videoResponse.ok) {
        throw new Error(handleTelegramError(videoData));
      }

      messageId = videoData.result?.message_id?.toString();
      postSuccess = true;

    } else if (story.media_type === 'text') {
      // Send text story (formatted message)
      const textContent = buildTextStory(story);

      const messageResponse = await fetch(`${baseUrl}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: textContent,
          parse_mode: "Markdown",
        }),
      });

      const messageData = await messageResponse.json();

      if (!messageResponse.ok) {
        throw new Error(handleTelegramError(messageData));
      }

      messageId = messageData.result?.message_id?.toString();
      postSuccess = true;
    }

    if (postSuccess) {
      // Update story status to 'posted'
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + (story.duration_hours || 24) * 60 * 60 * 1000).toISOString();

      const { error: updateError } = await supabase
        .from('telegram_stories')
        .update({
          status: 'posted',
          posted_at: now,
          expires_at: story.is_highlight ? null : expiresAt,
          telegram_message_id: messageId,
          telegram_chat_id: chatId,
        })
        .eq('story_id', storyId);

      if (updateError) {
        console.error('Failed to update story status:', updateError);
      }

      // Log analytics event
      try {
        await supabase
          .from('story_analytics')
          .insert({
            story_id: storyId,
            event_type: 'view',
            event_data: { posted_at: now, chat_id: chatId },
          });
      } catch (analyticsError) {
        console.error('Failed to log analytics:', analyticsError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Story posted successfully to Telegram",
          messageId,
          expiresAt: story.is_highlight ? null : expiresAt,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Failed to post story");

  } catch (error) {
    console.error("Error sending Telegram story:", error);

    // Update story status to 'failed'
    try {
      const { storyId } = await req.json();
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('telegram_stories')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq('story_id', storyId);
    } catch (updateError) {
      console.error('Failed to update story status to failed:', updateError);
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Make sure your bot token is correct and the chat_id is valid.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to build caption from story data
function buildCaption(story: { caption?: string; text_overlay?: TextOverlay[] }): string {
  let caption = story.caption || "";

  // Add text overlay information to caption if present
  if (story.text_overlay && Array.isArray(story.text_overlay) && story.text_overlay.length > 0) {
    const overlayTexts = story.text_overlay
      .map((overlay: TextOverlay) => overlay.text)
      .filter((text: string) => text && text.trim() !== "");

    if (overlayTexts.length > 0) {
      caption = overlayTexts.join("\n") + (caption ? "\n\n" + caption : "");
    }
  }

  return caption || "📸 New Story";
}

// Helper function to build text-only story content
function buildTextStory(story: { text_overlay?: Array<{ text: string }>; caption?: string; stickers?: Array<{ emoji: string }> }): string {
  let content = "";

  // Build from text overlay
  if (story.text_overlay && Array.isArray(story.text_overlay) && story.text_overlay.length > 0) {
    const overlayTexts = story.text_overlay.map((overlay: TextOverlay) => {
      let formattedText = overlay.text;

      // Apply formatting based on font weight
      if (overlay.fontWeight === 'bold') {
        formattedText = `*${formattedText}*`;
      }

      return formattedText;
    });

    content = overlayTexts.join("\n\n");
  }

  // Add caption if present
  if (story.caption) {
    content += content ? "\n\n" + story.caption : story.caption;
  }

  // Add stickers/emojis if present
  if (story.stickers && Array.isArray(story.stickers) && story.stickers.length > 0) {
    const emojiString = story.stickers
      .filter((s) => s.emoji)
      .map((s) => s.emoji)
      .join(" ");

    if (emojiString) {
      content += "\n\n" + emojiString;
    }
  }

  return content || "📢 New Announcement";
}

// Helper function to handle Telegram API errors
function handleTelegramError(errorData: { error_code?: number; description?: string }): string {
  if (errorData.error_code === 403) {
    return `Bot Access Error: Your bot is not a member of this chat. Please:\n1. Open your Telegram channel\n2. Add your bot as an Administrator\n3. Grant 'Post Messages' permission\n4. Try posting again`;
  } else if (errorData.error_code === 400 && errorData.description?.includes('chat not found')) {
    return `Chat Not Found: The chat ID is incorrect. For private channels:\n1. Forward a message from your channel to @userinfobot\n2. Copy the channel ID (starts with -100)\n3. Update your channel settings with the correct ID`;
  } else if (errorData.error_code === 400 && errorData.description?.includes('wrong file identifier')) {
    return `Invalid Media URL: The media file URL is invalid or expired. Please re-upload the media.`;
  }

  return `Telegram API Error: ${errorData.description || "Unknown error"}`;
}
