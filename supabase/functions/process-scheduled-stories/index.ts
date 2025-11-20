import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    // Fetch stories that are scheduled and due for posting
    const { data: scheduledStories, error: fetchError } = await supabase
      .from('telegram_stories')
      .select(`
        story_id,
        user_id,
        channel_id,
        media_type,
        media_url,
        caption,
        text_overlay,
        stickers,
        duration_hours,
        telegram_chat_id,
        channels (
          chat_id,
          bot_token
        )
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_time', now)
      .order('scheduled_time', { ascending: true })
      .limit(100);

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled stories: ${fetchError.message}`);
    }

    if (!scheduledStories || scheduledStories.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No scheduled stories to process",
          processed: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${scheduledStories.length} scheduled stories...`);

    let successCount = 0;
    let failedCount = 0;
    const results = [];

    // Process each scheduled story
    for (const story of scheduledStories) {
      try {
        const botToken = story.channels?.telegram_bot_token || Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (!botToken) {
          throw new Error("Bot token not configured");
        }

        const chatId = story.channels?.telegram_channel_id;
        if (!chatId) {
          throw new Error("Chat ID not configured");
        }

        const baseUrl = `https://api.telegram.org/bot${botToken}`;
        let messageId: string | null = null;

        // Send based on media type
        if (story.media_type === 'image') {
          const caption = buildCaption(story);

          const response = await fetch(`${baseUrl}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              photo: story.media_url,
              caption: caption,
              parse_mode: "Markdown",
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.description || "Failed to send photo");
          messageId = data.result?.message_id?.toString();

        } else if (story.media_type === 'video') {
          const caption = buildCaption(story);

          const response = await fetch(`${baseUrl}/sendVideo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              video: story.media_url,
              caption: caption,
              parse_mode: "Markdown",
              supports_streaming: true,
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.description || "Failed to send video");
          messageId = data.result?.message_id?.toString();

        } else if (story.media_type === 'text') {
          const textContent = buildTextStory(story);

          const response = await fetch(`${baseUrl}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: textContent,
              parse_mode: "Markdown",
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.description || "Failed to send message");
          messageId = data.result?.message_id?.toString();
        }

        // Update story status to 'posted'
        const postedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + (story.duration_hours || 24) * 60 * 60 * 1000).toISOString();

        await supabase
          .from('telegram_stories')
          .update({
            status: 'posted',
            posted_at: postedAt,
            expires_at: expiresAt,
            telegram_message_id: messageId,
            telegram_chat_id: chatId,
          })
          .eq('story_id', story.story_id);

        // Log analytics
        await supabase
          .from('story_analytics')
          .insert({
            story_id: story.story_id,
            event_type: 'view',
            event_data: { posted_at: postedAt, chat_id: chatId, scheduled: true },
          });

        successCount++;
        results.push({
          story_id: story.story_id,
          status: 'success',
          message_id: messageId,
        });

        console.log(`Successfully posted story ${story.story_id}`);

      } catch (error) {
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Update story status to 'failed'
        await supabase
          .from('telegram_stories')
          .update({
            status: 'failed',
            error_message: errorMessage,
          })
          .eq('story_id', story.story_id);

        results.push({
          story_id: story.story_id,
          status: 'failed',
          error: errorMessage,
        });

        console.error(`Failed to post story ${story.story_id}:`, errorMessage);
      }
    }

    console.log(`Processed ${scheduledStories.length} stories: ${successCount} succeeded, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${scheduledStories.length} scheduled stories`,
        processed: scheduledStories.length,
        succeeded: successCount,
        failed: failedCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing scheduled stories:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper functions (same as in send-telegram-story)
function buildCaption(story: any): string {
  let caption = story.caption || "";

  if (story.text_overlay && Array.isArray(story.text_overlay) && story.text_overlay.length > 0) {
    const overlayTexts = story.text_overlay
      .map((overlay: any) => overlay.text)
      .filter((text: string) => text && text.trim() !== "");

    if (overlayTexts.length > 0) {
      caption = overlayTexts.join("\n") + (caption ? "\n\n" + caption : "");
    }
  }

  return caption || "📸 New Story";
}

function buildTextStory(story: any): string {
  let content = "";

  if (story.text_overlay && Array.isArray(story.text_overlay) && story.text_overlay.length > 0) {
    const overlayTexts = story.text_overlay.map((overlay: any) => {
      let formattedText = overlay.text;
      if (overlay.fontWeight === 'bold') {
        formattedText = `*${formattedText}*`;
      }
      return formattedText;
    });

    content = overlayTexts.join("\n\n");
  }

  if (story.caption) {
    content += content ? "\n\n" + story.caption : story.caption;
  }

  if (story.stickers && Array.isArray(story.stickers) && story.stickers.length > 0) {
    const emojiString = story.stickers
      .filter((s: any) => s.emoji)
      .map((s: any) => s.emoji)
      .join(" ");

    if (emojiString) {
      content += "\n\n" + emojiString;
    }
  }

  return content || "📢 New Announcement";
}
