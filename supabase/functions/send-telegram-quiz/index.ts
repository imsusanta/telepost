import 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeUserFacingAi, classifyBearer, extractBearer } from '../_shared/auth.ts';
import { normalizeTelegramQuizQuestion, shuffleTelegramQuizOptions, type TelegramQuizQuestion } from '../_shared/telegram-quiz.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API_ORIGIN = 'https://api.telegram.org';

interface TelegramQuizRequest {
  chatId: string;
  channelId?: string;
  quiz: {
    topic: string;
    questions: TelegramQuizQuestion[];
    metadata?: { language?: string; [key: string]: unknown };
    language?: string;
    shuffleOptions?: boolean;
  };
  scheduleInterval?: number | null;
  minQuestionsPerInterval?: number | null;
  instantPoll?: boolean;
}

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
      const authClient = createClient(supabaseUrl, supabaseAnon, {
        global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
      });
      const { data: { user }, error } = await authClient.auth.getUser(extractBearer(req.headers.get('Authorization')));
      if (!user || error) return json({ error: 'Unauthorized' }, 401);
      callerUserId = user.id;
    }
    if (authorizeUserFacingAi({ classified, callerUserId }) !== 'allow') return json({ error: 'Unauthorized' }, 401);

    const { chatId, channelId, quiz, scheduleInterval, minQuestionsPerInterval, instantPoll } = await req.json() as TelegramQuizRequest;
    if (!chatId || !quiz || !Array.isArray(quiz.questions)) return json({ error: 'Missing required fields: chatId and quiz' }, 400);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    let botToken: string | null = null;

    if (channelId) {
      const { data: channel, error: channelError } = await supabaseAdmin
        .from('channels')
        .select('id, user_id, telegram_bot_token, telegram_channel_id')
        .eq('id', channelId)
        .single();
      if (channelError || !channel) return json({ error: 'Channel not found' }, 404);
      if (channel.user_id !== callerUserId) return json({ error: 'You do not have permission to post to this channel' }, 403);
      botToken = channel.telegram_bot_token;
    }

    if (!botToken && callerUserId) {
      const { data } = await supabaseAdmin.from('channels')
        .select('telegram_bot_token')
        .eq('user_id', callerUserId)
        .not('telegram_bot_token', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      botToken = data?.telegram_bot_token || null;
    }

    const { data: isSuperAdmin } = await supabaseAdmin.rpc('is_super_admin', { p_user_id: callerUserId });
    if (!botToken && isSuperAdmin === true) botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('ADMIN_BOT_TOKEN') || null;
    if (!botToken) return json({ error: 'No bot token available. Configure a bot token for the selected channel.' }, 400);

    const baseUrl = `${TELEGRAM_API_ORIGIN}/bot${botToken}`;
    const safeTruncate = (value: string, limit: number) => {
      const chars = Array.from(value || '');
      return chars.length <= limit ? value : chars.slice(0, limit - 3).join('') + '...';
    };
    const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
      for (let retry = 0; retry < maxRetries; retry++) {
        const response = await fetch(url, options);
        if (response.status !== 429) return response;
        const payload = await response.json().catch(() => ({})) as { parameters?: { retry_after?: number } };
        await new Promise((resolve) => setTimeout(resolve, Math.max(1000, (payload.parameters?.retry_after || 5) * 1000)));
      }
      return fetch(url, options);
    };

    // IMPORTANT: normalize first, then optionally shuffle. The correct index is
    // always recalculated against the exact option array sent to Telegram.
    const preparedQuestions = quiz.questions.map((raw) => {
      const normalized = normalizeTelegramQuizQuestion(raw);
      return quiz.shuffleOptions ? shuffleTelegramQuizOptions(normalized) : normalized;
    });

    const shouldQueue = Boolean(scheduleInterval) || (preparedQuestions.length > 100 && !instantPoll);
    if (shouldQueue) {
      const now = new Date();
      const questionsPerPost = scheduleInterval ? (minQuestionsPerInterval || 1) : 5;
      const effectiveInterval = scheduleInterval || 1;
      const batches: TelegramQuizQuestion[][] = [];
      for (let i = 0; i < preparedQuestions.length; i += questionsPerPost) {
        batches.push(preparedQuestions.slice(i, i + questionsPerPost));
      }

      const rows = batches.map((batch, index) => ({
        user_id: callerUserId,
        channel_id: channelId || null,
        chat_id: chatId,
        quiz_data: {
          topic: quiz.topic,
          questions: batch,
          metadata: quiz.metadata || {},
          language: quiz.language || quiz.metadata?.language || null,
        },
        scheduled_time: new Date(now.getTime() + (index + 1) * effectiveInterval * 60 * 1000).toISOString(),
        min_questions_per_interval: questionsPerPost,
        status: 'pending',
      }));

      const { error } = await supabaseAdmin.from('scheduled_telegram_posts').insert(rows);
      if (error) return json({ error: `Failed to schedule posts: ${error.message}` }, 500);
      return json({ success: true, isQueued: true, scheduledCount: preparedQuestions.length, postsCount: rows.length });
    }

    let normalizedChatId = chatId;
    if (!chatId.startsWith('@') && !chatId.startsWith('-100')) {
      const numericId = chatId.replace(/^-/, '');
      if (/^\d+$/.test(numericId)) normalizedChatId = `-100${numericId}`;
    }

    const storedLanguage = quiz.metadata?.language || quiz.language || '';
    const hasBengali = storedLanguage === 'bn' || storedLanguage === 'Bengali' || preparedQuestions.some((q) => /[\u0980-\u09FF]/.test(q.question || ''));
    const hasHindi = !hasBengali && (storedLanguage === 'hi' || storedLanguage === 'Hindi' || preparedQuestions.some((q) => /[\u0900-\u097F]/.test(q.question || '')));
    const introText = hasBengali
      ? `📝 *বিষয়: ${quiz.topic || 'সাধারণ'}*\n\n📊 আপনার জন্য ${preparedQuestions.length}টি প্রশ্ন! নীচের প্রশ্নগুলির উত্তর দিন:`
      : hasHindi
        ? `📝 *विषय: ${quiz.topic || 'सामान्य'}*\n\n📊 आपके लिए ${preparedQuestions.length} प्रश्न! नीचे दिए गए प्रश्नों के उत्तर दें:`
        : `📝 *Topic: ${quiz.topic || 'General'}*\n\n📊 ${preparedQuestions.length} questions for you! Answer the questions below:`;

    const introResponse = await fetch(`${baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: normalizedChatId, text: safeTruncate(introText, 4000), parse_mode: 'Markdown' }),
    });
    if (!introResponse.ok) return json({ error: 'Telegram could not start the quiz.' }, 502);

    const results: Array<{ question: number; success: boolean; message?: string }> = [];
    const failures: Array<{ question: number; error: string }> = [];

    for (let i = 0; i < preparedQuestions.length; i++) {
      const q = preparedQuestions[i];
      const questionText = safeTruncate(`Q${i + 1}: ${q.question}`, 200);
      const response = await fetchWithRetry(`${baseUrl}/sendPoll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: normalizedChatId,
          question: questionText,
          options: q.options.map((option) => safeTruncate(option, 100)),
          type: 'quiz',
          // CRITICAL: this is the actual index after any shuffle.
          correct_option_id: q.correct_option_index,
          explanation: safeTruncate(q.explanation || 'Correct answer explanation', 200),
          is_anonymous: true,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({})) as { description?: string };
        failures.push({ question: i + 1, error: errorPayload.description || 'Telegram rejected the poll' });
        results.push({ question: i + 1, success: false, message: errorPayload.description || 'Telegram rejected the poll' });
        continue;
      }

      results.push({ question: i + 1, success: true });
      if (i < preparedQuestions.length - 1) await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    return json({ success: failures.length === 0, results, failures, pollsSent: results.filter((result) => result.success).length });
  } catch (error) {
    console.error('Error sending Telegram quiz:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
