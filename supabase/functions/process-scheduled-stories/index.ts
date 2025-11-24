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
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    // Fetch stories that are scheduled and due for posting
    const { data: stories, error: fetchError } = await supabaseAdmin
      .from('telegram_stories')
      .select(`
        *,
        channels (
          telegram_channel_id
        )
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_time', now)
      .order('scheduled_time', { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error('Error fetching scheduled stories:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch scheduled stories' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stories || stories.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No scheduled stories to process",
          processed: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${stories.length} scheduled stories...`);

    let successCount = 0;
    let failedCount = 0;
    const results = [];

    // Process each scheduled story
    for (const story of stories) {
      try {
        const channel = story.channels as any;
        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (!botToken) {
          throw new Error("Bot token not configured");
        }

        const chatId = channel?.telegram_channel_id;
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
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.description || "Failed to send video");
          messageId = data.result?.message_id?.toString();
        }

        // Update story status to posted
        const { error: updateError } = await supabaseAdmin
          .from('telegram_stories')
          .update({
            status: 'posted',
            posted_at: new Date().toISOString(),
            telegram_message_id: messageId,
          })
          .eq('story_id', story.story_id);

        if (updateError) throw updateError;

        successCount++;
        results.push({
          story_id: story.story_id,
          status: 'success',
          message_id: messageId,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to process story ${story.story_id}:`, errorMessage);

        // Update story with error
        await supabaseAdmin
          .from('telegram_stories')
          .update({
            status: 'failed',
            error_message: errorMessage,
          })
          .eq('story_id', story.story_id);

        failedCount++;
        results.push({
          story_id: story.story_id,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: stories.length,
        successful: successCount,
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

function buildCaption(story: any): string {
  let caption = story.caption || "";
  
  if (story.text_overlay && Array.isArray(story.text_overlay)) {
    const overlayTexts = story.text_overlay
      .map((overlay: any) => overlay.text)
      .filter(Boolean)
      .join("\n");
    if (overlayTexts) {
      caption = caption ? `${caption}\n\n${overlayTexts}` : overlayTexts;
    }
  }
  
  return caption;
}