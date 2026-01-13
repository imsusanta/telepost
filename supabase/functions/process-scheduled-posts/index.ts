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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const GLOBAL_TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

    // Get all pending posts that are due (limit to 50 per run to avoid timeouts)
    const { data: pendingPosts, error: fetchError } = await supabase
      .from('scheduled_telegram_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_time', new Date().toISOString())
      .order('scheduled_time', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("Error fetching scheduled posts:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingPosts?.length || 0} pending posts to process`);

    if (!pendingPosts || pendingPosts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: "No pending posts to process",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark all posts as processing to prevent duplicate processing
    const postIds = pendingPosts.map(p => p.id);
    await supabase
      .from('scheduled_telegram_posts')
      .update({ status: 'processing' })
      .in('id', postIds);

    const results = [];

    for (const post of pendingPosts || []) {
      try {
        // Fetch channel-specific bot token based on chat_id
        const { data: channel, error: channelError } = await supabase
          .from('channels')
          .select('telegram_bot_token, name')
          .eq('telegram_channel_id', post.chat_id)
          .maybeSingle();

        if (channelError) {
          console.error(`Error fetching channel for chat_id ${post.chat_id}:`, channelError);
        }

        // Use channel-specific token, fallback to global token
        const botToken = channel?.telegram_bot_token || GLOBAL_TELEGRAM_BOT_TOKEN;

        if (!botToken) {
          throw new Error(`No bot token available for chat_id: ${post.chat_id}. Please configure a bot token in channel settings or set TELEGRAM_BOT_TOKEN environment variable.`);
        }

        console.log(`Processing post ${post.id} for chat ${post.chat_id} using ${channel?.telegram_bot_token ? 'channel-specific' : 'global'} bot token`);

        const baseUrl = `https://api.telegram.org/bot${botToken}`;

        // Helper to send Telegram requests with retry logic for 429 errors
        async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
          let retries = 0;
          while (retries < maxRetries) {
            const response = await fetch(url, options);
            if (response.status === 429) {
              const data = await response.json();
              const retryAfter = (data.parameters?.retry_after || 5) * 1000;
              console.warn(`Rate limited by Telegram. Retrying after ${retryAfter}ms...`);
              await new Promise(resolve => setTimeout(resolve, retryAfter));
              retries++;
              continue;
            }
            return response;
          }
          return fetch(url, options); // Final attempt
        }

        // Detect if questions contain Bengali text
        const hasBengaliText = post.quiz_data.questions.some((q: any) =>
          /[\u0980-\u09FF]/.test(q.question || '')
        );

        // Language-aware intro message
        const introText = hasBengaliText
          ? `📝 *কুইজ: ${post.quiz_data.topic}*\n\n📊 আপনার জন্য ${post.quiz_data.questions.length}টি প্রশ্ন! নীচের প্রশ্নগুলির উত্তর দিন:`
          : `📝 *Quiz: ${post.quiz_data.topic}*\n\n📊 ${post.quiz_data.questions.length} questions for you! Answer the questions below:`;

        // Send intro message
        const introResponse = await fetchWithRetry(`${baseUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: post.chat_id,
            text: introText,
            parse_mode: "Markdown",
          }),
        });

        if (!introResponse.ok) {
          const introData = await introResponse.json();
          console.error(`Failed to send intro message:`, introData);
          throw new Error(`Bot access error: ${introData.description || "Failed to send message"}. Make sure the bot is added as an admin to the channel with 'Post Messages' permission.`);
        }

        // Send each question as a poll
        // Safe truncate for multi-byte characters (Bengali/emoji)
        const safeTruncate = (strValue: string, limit: number): string => {
          if (!strValue) return "";
          const chars = Array.from(strValue);
          if (chars.length <= limit) return strValue;
          return chars.slice(0, limit - 3).join("") + "...";
        };

        for (let i = 0; i < post.quiz_data.questions.length; i++) {
          const q = post.quiz_data.questions[i];

          // Telegram Poll Limits (ULTRA STRICT for Bengali/emoji safety):
          // Question: 300 chars max (we use 200 for maximum safety)
          // Options: 100 chars each max (we use 80 for maximum safety)
          // Explanation: 200 chars max (we use 150 for maximum safety)
          // Max 10 options allowed

          const questionCharCount = Array.from(q.question || "").length;
          const requiresFallback = questionCharCount > 200;
          const pollQuestion = requiresFallback
            ? safeTruncate(`Q${i + 1}: Select the correct answer:`, 200)
            : safeTruncate(`Q${i + 1}: ${q.question}`, 200);

          if (requiresFallback) {
            // Send the full question text as a message first
            await fetchWithRetry(`${baseUrl}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: post.chat_id,
                text: safeTruncate(`*Question ${i + 1}:*\n${q.question}`, 4000),
                parse_mode: "Markdown",
              }),
            });
          }

          // Ensure options are valid and truncated
          let pollOptions = (q.options || [])
            .slice(0, 10) // Max 10 options
            .map(opt => safeTruncate(String(opt || "Option"), 80))
            .filter(opt => opt.length > 0);

          // Telegram requires at least 2 options
          while (pollOptions.length < 2) {
            pollOptions.push("Option " + (pollOptions.length + 1));
          }

          const pollExplanation = safeTruncate(q.explanation || "Correct", 150);

          const pollResponse = await fetchWithRetry(`${baseUrl}/sendPoll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: post.chat_id,
              question: pollQuestion,
              options: pollOptions,
              type: "quiz",
              correct_option_id: q.correct_option_index,
              explanation: pollExplanation,
              is_anonymous: true,
            }),
          });

          if (!pollResponse.ok) {
            const pollData = await pollResponse.json();
            console.error(`Failed to send poll ${i + 1}:`, pollData);
            throw new Error(`Failed to send poll: ${pollData.description || "Unknown error"}`);
          }

          // Delay between polls to avoid rate limiting
          // Increased to 2s for better compliance in background batches
          if (i < post.quiz_data.questions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        // Update post as sent
        await supabase
          .from('scheduled_telegram_posts')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        results.push({ id: post.id, status: 'sent' });
        console.log(`Successfully sent scheduled post ${post.id}`);

      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);

        // Update post as failed
        await supabase
          .from('scheduled_telegram_posts')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq('id', post.id);

        results.push({ id: post.id, status: 'failed', error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing scheduled posts:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
