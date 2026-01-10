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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { chatId, channelId, quiz, scheduleInterval, minQuestionsPerInterval, instantPoll }: TelegramQuizRequest = await req.json();

    if (!chatId || !quiz || !quiz.questions) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: chatId and quiz" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate chatId format (prevent injection)
    const chatIdRegex = /^(@[a-zA-Z0-9_]+|-?[0-9]+)$/;
    if (!chatIdRegex.test(chatId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid chat ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If scheduleInterval is provided, create recurring scheduled posts
    if (scheduleInterval) {
      const now = new Date();
      const scheduledPosts = [];

      // Determine how many questions per post (default to 1 if not specified)
      const questionsPerPost = minQuestionsPerInterval || 1;

      // Group questions into batches according to minQuestionsPerInterval
      const questionBatches = [];
      for (let i = 0; i < quiz.questions.length; i += questionsPerPost) {
        questionBatches.push(quiz.questions.slice(i, i + questionsPerPost));
      }

      // Create a scheduled post for each batch at the specified interval
      for (let i = 0; i < questionBatches.length; i++) {
        const scheduledTime = new Date(now.getTime() + ((i + 1) * scheduleInterval * 60 * 1000));
        scheduledPosts.push({
          user_id: user.id,
          channel_id: channelId || null, // Store channel reference for scheduled posts
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
    }

    // Send immediately using the channel-specific bot token
    const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // Send intro message
    const introResponse = await fetch(`${baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `📚 Topic: ${quiz.topic}\n\nHere are ${quiz.questions.length} questions for you! Answer the polls below:`,
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

    // Send each question as a poll
    const results = [];
    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];

      const pollResponse = await fetch(`${baseUrl}/sendPoll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          question: `Q${i + 1}: ${question.question}`,
          options: question.options,
          type: "quiz",
          correct_option_id: question.correct_option_index,
          explanation: question.explanation || "Check the answer!",
          is_anonymous: true,
        }),
      });

      const pollData = await pollResponse.json();

      if (!pollResponse.ok) {
        console.error(`Failed to send poll ${i + 1}:`, pollData);

        let errorMsg = `Failed to send poll: ${pollData.description || "Unknown error"}`;
        if (pollData.error_code === 403) {
          errorMsg = `Bot Access Error: Your bot is not a member of this chat. Please:\n1. Open Telegram and add your bot as an Administrator\n2. Grant it 'Post Messages' permission\n3. Try again`;
        } else if (pollData.error_code === 400 && pollData.description?.includes('chat not found')) {
          errorMsg = `Chat Not Found: The chat ID "${chatId}" doesn't exist or is incorrect.`;
        }

        return new Response(
          JSON.stringify({ success: false, error: errorMsg }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      results.push(pollData);

      // Small delay between polls to avoid rate limiting
      if (!instantPoll && i < quiz.questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Successfully sent ${results.length} polls to chat ${chatId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.length} quiz polls to Telegram`,
        pollsSent: results.length,
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
