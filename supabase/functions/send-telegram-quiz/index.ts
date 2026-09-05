import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeUserFacingAi, classifyBearer, extractBearer } from '../_shared/auth.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API_ORIGIN = 'https:' + '//api.telegram.org';

interface TelegramQuizRequest {
  chatId: string;
  channelId?: string;
  quiz: {
    topic: string;
    questions: Array<{
      question: string;
      options: string[];
      correct_option_index: number;
      explanation?: string;
    }>;
    metadata?: {
      language?: string;
      [key: string]: unknown;
    };
    language?: string;
  };
  scheduleInterval?: number | null;
  minQuestionsPerInterval?: number | null;
  instantPoll?: boolean;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const classified = classifyBearer({
      authorizationHeader: req.headers.get('Authorization'),
      cronSecretHeader: req.headers.get('x-cron-secret'),
      cronSecret: Deno.env.get('CRON_SECRET'),
      serviceRoleKey,
    });
    let callerUserId: string | null = null;
    if (classified === 'user-or-unknown') {
      const supabase = createClient(supabaseUrl, supabaseAnon, {
        global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
      });
      const { data: { user }, error: authError } = await supabase.auth.getUser(extractBearer(req.headers.get('Authorization')));
      if (!authError && user) callerUserId = user.id;
    }
    if (authorizeUserFacingAi({ classified, callerUserId }) !== 'allow') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user = { id: callerUserId as string };

    const { chatId, channelId, quiz, scheduleInterval, minQuestionsPerInterval, instantPoll } = await req.json() as TelegramQuizRequest;

    if (!chatId || !quiz || !quiz.questions) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: chatId and quiz" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    let TELEGRAM_BOT_TOKEN: string | null = null;

    if (channelId) {
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

      if (channel.user_id !== user.id) {
        console.error(`Security violation: User ${user.id} tried to post to channel ${channelId} owned by ${channel.user_id}`);
        return new Response(
          JSON.stringify({ error: 'You do not have permission to post to this channel' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      TELEGRAM_BOT_TOKEN = channel.telegram_bot_token;
    }

    if (!TELEGRAM_BOT_TOKEN) {
      const { data: botChannel } = await supabaseAdmin
        .from('channels')
        .select('telegram_bot_token')
        .eq('user_id', user.id)
        .not('telegram_bot_token', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (botChannel) TELEGRAM_BOT_TOKEN = botChannel.telegram_bot_token;
    }

    const { data: isSuperAdmin } = await supabaseAdmin.rpc('is_super_admin', { p_user_id: user.id });
    if (!TELEGRAM_BOT_TOKEN && isSuperAdmin === true) {
      TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || Deno.env.get("ADMIN_BOT_TOKEN") || null;
    }

    const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
    if (ADMIN_BOT_TOKEN && TELEGRAM_BOT_TOKEN === ADMIN_BOT_TOKEN && isSuperAdmin !== true) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This bot is for administrative use only. Please add your own Telegram bot token to your channel in the 'Channels' page."
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No bot token available. Please configure a bot token for the selected channel in the 'Channels' page."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shouldQueue = scheduleInterval || (quiz.questions.length > 100 && !instantPoll);

    if (shouldQueue) {
      const now = new Date();
      const scheduledPosts = [];
      const questionsPerPost = scheduleInterval ? (minQuestionsPerInterval || 1) : 5;
      const effectiveInterval = scheduleInterval || 1;
      const questionBatches = [];
      for (let i = 0; i < quiz.questions.length; i += questionsPerPost) {
        questionBatches.push(quiz.questions.slice(i, i + questionsPerPost));
      }

      for (let i = 0; i < questionBatches.length; i++) {
        const scheduledTime = new Date(now.getTime() + ((i + 1) * effectiveInterval * 60 * 1000));
        scheduledPosts.push({
          user_id: user.id,
          channel_id: channelId || null,
          chat_id: chatId,
          quiz_data: {
            topic: quiz.topic,
            questions: questionBatches[i],
            metadata: quiz.metadata || {},
            language: quiz.language || quiz.metadata?.language || null,
          },
          scheduled_time: scheduledTime.toISOString(),
          min_questions_per_interval: questionsPerPost,
          status: 'pending',
        });
      }

      const { error: insertError } = await supabaseAdmin
        .from('scheduled_telegram_posts')
        .insert(scheduledPosts);

      if (insertError) throw new Error(`Failed to schedule posts: ${insertError.message}`);

      if (scheduleInterval) {
        const totalPosts = questionBatches.length;
        const message = questionsPerPost === 1
          ? `Scheduled ${quiz.questions.length} quiz questions to post every ${scheduleInterval} minute(s)`
          : `Scheduled ${totalPosts} posts with ${questionsPerPost} questions each to post every ${scheduleInterval} minute(s) (${quiz.questions.length} total questions)`;

        return new Response(
          JSON.stringify({ success: true, message, scheduledCount: quiz.questions.length, postsCount: totalPosts, questionsPerPost }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, isQueued: true, message: `Large quiz (${quiz.questions.length} questions) queued for background delivery. It will appear in Telegram shortly.`, pollsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let normalizedChatId = chatId;
    if (chatId && !chatId.startsWith('@') && !chatId.startsWith('-100')) {
      const numericId = chatId.replace(/^-/, '');
      if (/^\d+$/.test(numericId)) normalizedChatId = `-100${numericId}`;
    }

    const baseUrl = `${TELEGRAM_API_ORIGIN}/bot${TELEGRAM_BOT_TOKEN}`;

    const safeTruncate = (str: string, limit: number): string => {
      if (!str) return "";
      const chars = Array.from(str);
      return chars.length <= limit ? str : chars.slice(0, limit - 3).join("") + "...";
    };

    const storedLanguage = quiz.metadata?.language || quiz.language || '';
    const hasBengaliText = storedLanguage === 'bn' || storedLanguage === 'Bengali' || quiz.questions.some((q) => /[\u0980-\u09FF]/.test(q.question || ''));
    const hasHindiText = !hasBengaliText && (storedLanguage === 'hi' || storedLanguage === 'Hindi' || quiz.questions.some((q) => /[\u0900-\u097F]/.test(q.question || '')));

    // Use "বিষয়" instead of "কুইজ" so the intro clearly labels the topic.
    const introText = hasBengaliText
      ? `📝 *বিষয়: ${quiz.topic || "সাধারণ"}*\n\n📊 আপনার জন্য ${quiz.questions.length}টি প্রশ্ন! নীচের প্রশ্নগুলির উত্তর দিন:`
      : hasHindiText
        ? `📝 *विषय: ${quiz.topic || "सामान्य"}*\n\n📊 आपके लिए ${quiz.questions.length} प्रश्न! नीचे दिए गए प्रश्नों के उत्तर दें:`
        : `📝 *Topic: ${quiz.topic || "General"}*\n\n📊 ${quiz.questions.length} questions for you! Answer the questions below:`;

    const introResponse = await fetch(`${baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: normalizedChatId, text: safeTruncate(introText, 4000), parse_mode: "Markdown" }),
    });

    if (!introResponse.ok) {
      const introData: Record<string, unknown> = await introResponse.json();
      const description = typeof introData.description === 'string' ? introData.description : 'Failed to start quiz';
      let errorMsg = `Telegram Error: ${description}`;
      if (introData.error_code === 403) errorMsg = `Bot Access Error: Your bot is not a member of this chat or is not an administrator. Please check permissions.`;
      else if (introData.error_code === 400 && description.includes('chat not found')) errorMsg = `Chat Not Found: The chat ID "${chatId}" is incorrect or the bot hasn't seen this chat yet.`;
      return new Response(JSON.stringify({ success: false, error: errorMsg }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
      let retries = 0;
      while (retries < maxRetries) {
        const response = await fetch(url, options);
        if (response.status === 429) {
          const data = await response.json() as { parameters?: { retry_after?: number } };
          const retryAfter = (data.parameters?.retry_after || 5) * 1000;
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          retries++;
          continue;
        }
        return response;
      }
      return fetch(url, options);
    }

    const results: Array<{ question: number; success: boolean; message?: string }> = [];
    const failures: Array<{ question: number; error: string }> = [];
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      const questionCharCount = Array.from(q.question || "").length;
      const requiresFallback = questionCharCount > 200;
      const pollQuestion = requiresFallback ? safeTruncate(`Q${i + 1}: Select the correct answer:`, 200) : safeTruncate(`Q${i + 1}: ${q.question}`, 200);

      if (requiresFallback) {
        await fetchWithRetry(`${baseUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: normalizedChatId, text: safeTruncate(`*Question ${i + 1}:*\n${q.question}`, 4000), parse_mode: "Markdown" }),
        });
      }

      let pollOptions = (q.options || []).slice(0, 10).map(opt => safeTruncate(String(opt || "Option"), 80)).filter(opt => opt.length > 0);
      while (pollOptions.length < 2) pollOptions.push("Option " + (pollOptions.length + 1));

      const correctIndex = Number.parseInt(String(q.correct_option_index), 10);
      const safeCorrectIndex = Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < pollOptions.length ? correctIndex : 0;
      const pollExplanation = safeTruncate(q.explanation || "Correct", 150);

      const pollResponse = await fetchWithRetry(`${baseUrl}/sendPoll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: normalizedChatId,
          question: pollQuestion,
          options: pollOptions,
          type: "quiz",
          correct_option_id: safeCorrectIndex,
          explanation: pollExplanation,
          is_anonymous: true,
        }),
      });

      if (!pollResponse.ok) {
        const pollData = await pollResponse.json().catch(() => ({ description: "Failed to parse error response" })) as { description?: string };
        failures.push({ question: i + 1, error: pollData.description || "Unknown error" });
        results.push({ question: i + 1, success: false, message: pollData.description || "Unknown error" });
        continue;
      }

      results.push({ question: i + 1, success: true });
      if (i < quiz.questions.length - 1) await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return new Response(
      JSON.stringify({ success: failures.length === 0, results, failures, pollsSent: results.filter(r => r.success).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending Telegram quiz:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});