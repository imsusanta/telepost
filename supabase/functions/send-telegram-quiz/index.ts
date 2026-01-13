import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramQuizRequest {
  chatId: string;
  channelId?: string; // NEW: Channel ID for ownership verification
  quiz: {
    topic: string;
    questions: Array<{
      question: string;
      options: string[];
      correct_option_index: number;
      explanation?: string;
    }>;
  };
  scheduleInterval?: number | null;
  minQuestionsPerInterval?: number | null;
  instantPoll?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Always authenticate edge function calls
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        JSON.stringify({ error: 'Invalid token' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { chatId, channelId, quiz, scheduleInterval, minQuestionsPerInterval, instantPoll }: TelegramQuizRequest = await req.json();

    if (!chatId || !quiz || !quiz.questions) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: chatId and quiz" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY FIX: Get bot token from channel with ownership verification
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    let TELEGRAM_BOT_TOKEN: string | null = null;

    if (channelId) {
      // Verify user owns this channel and get its bot token
      const { data: channel, error: channelError } = await supabaseAdmin
        .from('channels')
        .select('id, user_id, telegram_bot_token, telegram_channel_id')
        .eq('id', channelId)
        .single();

      if (channelError || !channel) {
        return new Response(
          JSON.stringify({ error: 'Channel not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // SECURITY: Verify ownership
      if (channel.user_id !== user.id) {
        console.error(`Security violation: User ${user.id} tried to post to channel ${channelId} owned by ${channel.user_id}`);
        return new Response(
          JSON.stringify({ error: 'You do not have permission to post to this channel' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      TELEGRAM_BOT_TOKEN = channel.telegram_bot_token;
    }

    // FALLBACK: If specific channel has no token, look for ANY channel with a bot token owned by the user
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

    // Fallback to global bot token as extreme last resort
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
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`Access granted: Super admin ${user.id} is using the administrative bot token.`);
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No bot token available. Please configure a bot token for the selected channel in the 'Channels' page."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If scheduleInterval is provided OR if there are MANY questions (> 100), 
    // automatically queue them to avoid timeouts and rate limits
    // Users can send up to 100 questions immediately
    const shouldQueue = scheduleInterval || (quiz.questions.length > 100 && !instantPoll);

    if (shouldQueue) {
      const now = new Date();
      const scheduledPosts = [];

      // Determine how many questions per post
      // For auto-queued large quizzes, we use a conservative default of 5 per batch
      const questionsPerPost = scheduleInterval ? (minQuestionsPerInterval || 1) : 5;
      const effectiveInterval = scheduleInterval || 1; // Default to 1 min interval for auto-queue

      // Group questions into batches
      const questionBatches = [];
      for (let i = 0; i < quiz.questions.length; i += questionsPerPost) {
        questionBatches.push(quiz.questions.slice(i, i + questionsPerPost));
      }

      // Create a scheduled post for each batch
      for (let i = 0; i < questionBatches.length; i++) {
        // First batch is scheduled for now + 1 min, then spaced by effectiveInterval
        const scheduledTime = new Date(now.getTime() + ((i + 1) * effectiveInterval * 60 * 1000));
        scheduledPosts.push({
          user_id: user.id,
          channel_id: channelId || null,
          chat_id: chatId,
          quiz_data: {
            topic: quiz.topic,
            questions: questionBatches[i],
          },
          scheduled_time: scheduledTime.toISOString(),
          min_questions_per_interval: questionsPerPost,
          status: 'pending',
        });
      }

      const { error: insertError } = await supabaseAdmin
        .from('scheduled_telegram_posts')
        .insert(scheduledPosts);

      if (insertError) {
        throw new Error(`Failed to schedule posts: ${insertError.message}`);
      }

      if (scheduleInterval) {
        const totalPosts = questionBatches.length;
        const message = questionsPerPost === 1
          ? `Scheduled ${quiz.questions.length} quiz questions to post every ${scheduleInterval} minute(s)`
          : `Scheduled ${totalPosts} posts with ${questionsPerPost} questions each to post every ${scheduleInterval} minute(s) (${quiz.questions.length} total questions)`;

        return new Response(
          JSON.stringify({
            success: true,
            message,
            scheduledCount: quiz.questions.length,
            postsCount: totalPosts,
            questionsPerPost,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Auto-queued response
        return new Response(
          JSON.stringify({
            success: true,
            isQueued: true,
            message: `Large quiz (${quiz.questions.length} questions) queued for background delivery. It will appear in Telegram shortly.`,
            pollsSent: 0
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Send immediately using the channel-specific bot token
    const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // Helper to truncate text to Telegram limits with surrogate-pair safety
    const safeTruncate = (str: string, limit: number): string => {
      if (!str) return "";
      // Use Array.from to correctly handle emojis and multi-unit characters
      const chars = Array.from(str);
      if (chars.length <= limit) return str;
      return chars.slice(0, limit - 3).join("") + "...";
    };

    // Detect if questions contain Bengali text
    const hasBengaliText = quiz.questions.some((q: any) => {
      const questionText = q.question || '';
      const isBengali = /[\u0980-\u09FF]/.test(questionText);
      console.log(`Question: "${questionText.substring(0, 50)}..." -> Bengali: ${isBengali}`);
      return isBengali;
    });
    console.log(`Final hasBengaliText: ${hasBengaliText}`);

    // Language-aware intro message - Updated 23:55 IST
    const introText = hasBengaliText
      ? `📚 বিষয়: ${quiz.topic}\n\nআপনার জন্য ${quiz.questions.length}টি প্রশ্ন রয়েছে! নীচের প্রশ্নগুলির উত্তর দিন:`
      : `📚 Topic: ${quiz.topic}\n\nHere are ${quiz.questions.length} questions for you! Answer the questions below:`;

    // Send intro message
    const introResponse = await fetch(`${baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: safeTruncate(introText, 4000),
        parse_mode: "Markdown",
      }),
    });

    if (!introResponse.ok) {
      const introData = await introResponse.json();
      console.error("Failed to send intro message:", introData);

      let errorMsg = `Telegram Error: ${introData.description || "Failed to start quiz"}`;
      if (introData.error_code === 403) {
        errorMsg = `Bot Access Error: Your bot is not a member of this chat or is not an administrator. Please check permissions.`;
      } else if (introData.error_code === 400 && introData.description?.includes('chat not found')) {
        errorMsg = `Chat Not Found: The chat ID "${chatId}" is incorrect or the bot hasn't seen this chat yet.`;
      }

      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Send each question as a poll
    const results = [];
    const failures = [];
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];

      // Telegram Poll Limits (ULTRA STRICT for Bengali/emoji safety):
      // Question: 300 chars max (we use 200 for maximum safety)
      // Options: 100 chars each max (we use 80 for maximum safety)
      // Explanation: 200 chars max (we use 150 for maximum safety)
      // Max 10 options allowed

      const questionCharCount = Array.from(q.question || "").length;
      const requiresFallback = questionCharCount > 200;
      const pollQuestion = requiresFallback
        ? safeTruncate(`Q${i + 1}. Select the correct answer:`, 200)
        : safeTruncate(`Q${i + 1}. ${q.question}`, 200);

      if (requiresFallback) {
        // Send the full question text as a message first
        // Limit to 4000 to avoid "message too long" error
        try {
          await fetchWithRetry(`${baseUrl}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: safeTruncate(`*Question ${i + 1}:*\n${q.question}`, 4000),
              parse_mode: "Markdown",
            }),
          });
        } catch (e) {
          console.error(`Failed to send fallback message for Q${i + 1}:`, e);
        }
      }

      // Ensure options are valid and truncated
      let pollOptions = (q.options || [])
        .slice(0, 10) // Max 10 options
        .map(opt => safeTruncate(String(opt || "Option"), 80))
        .filter(opt => opt.length > 0); // Remove empty options

      // Telegram requires at least 2 options
      while (pollOptions.length < 2) {
        pollOptions.push("Option " + (pollOptions.length + 1));
      }

      const pollExplanation = safeTruncate(q.explanation || "Correct", 150);

      try {
        const pollResponse = await fetchWithRetry(`${baseUrl}/sendPoll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            question: pollQuestion,
            options: pollOptions,
            type: "quiz",
            correct_option_id: q.correct_option_index,
            explanation: pollExplanation,
            is_anonymous: true,
          }),
        });

        const pollData = await pollResponse.json();

        if (!pollResponse.ok) {
          console.error(`Failed to send poll ${i + 1}:`, pollData);
          failures.push({
            questionIndex: i + 1,
            error: pollData.description || "Unknown error"
          });
          // Continue to next question instead of stopping
          continue;
        }

        results.push(pollData);
      } catch (pollError) {
        console.error(`Exception sending poll ${i + 1}:`, pollError);
        failures.push({
          questionIndex: i + 1,
          error: pollError instanceof Error ? pollError.message : "Unknown error"
        });
        // Continue to next question
        continue;
      }

      // Delay between polls to avoid rate limiting
      // Standard: 200ms, Instant: 50ms (Telegram allows ~30 msgs/sec)
      const delay = instantPoll ? 50 : 200;
      if (i < quiz.questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`Sent ${results.length} polls, ${failures.length} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: failures.length > 0
          ? `Sent ${results.length}/${quiz.questions.length} polls. ${failures.length} failed due to message length limits.`
          : `Sent ${results.length} quiz polls to Telegram`,
        pollsSent: results.length,
        pollsFailed: failures.length,
        failures: failures.length > 0 ? failures : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending Telegram quiz:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Make sure your bot token is correct and the chat_id is valid."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
