// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { authorizeOwnedRecord, classifyBearer, extractBearer, publicErrorMessage } from "../_shared/auth.ts";
import { chatCompletion, parseJsonObject, resolveAIProvider, type AISettings, type ResolvedAIProvider } from "../_shared/ai-provider.ts";
import { composeTelePostSystemPrompt } from "../_shared/prompt-composer.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };

interface ChannelSettings {
  auto_generate_quizzes: boolean;
  default_subject: string;
  default_difficulty: 'easy' | 'medium' | 'hard';
  default_language: 'bn' | 'en' | 'hi';
  questions_per_quiz: number;
  generation_frequency: string;
  system_prompt: string;
}
interface Channel {
  id: string;
  user_id: string;
  name: string;
  telegram_channel_id: string;
  telegram_bot_token: string | null;
  settings: ChannelSettings;
}

async function getAISettings(supabase: any): Promise<AISettings> {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'ai_settings').maybeSingle();
  return data?.setting_value || { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free', temperature: 0.7 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const cronSecret = Deno.env.get('CRON_SECRET');
  const classified = classifyBearer({
    authorizationHeader: req.headers.get('Authorization'),
    cronSecretHeader: req.headers.get('x-cron-secret'),
    cronSecret,
    serviceRoleKey,
  });
  if (classified === 'missing') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let callerUserId: string | null = null;
  const isInternal = classified === 'internal';
  if (!isInternal) {
    try {
      const authClient = createClient(supabaseUrl!, anonKey!);
      const { data } = await authClient.auth.getUser(extractBearer(req.headers.get('Authorization')));
      if (!data?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      callerUserId = data.user.id;
    } catch {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase configuration');
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const globalBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    let specificChannelId: string | null = null;
    let forceGenerate = false;
    try {
      const body = await req.json();
      specificChannelId = typeof body.channelId === 'string' ? body.channelId : null;
      forceGenerate = body.forceGenerate === true;
    } catch { /* empty cron body */ }

    if (!isInternal && specificChannelId) {
      const { data: ownedChannel } = await supabase.from('channels').select('id, user_id').eq('id', specificChannelId).maybeSingle();
      const decision = authorizeOwnedRecord({
        classified,
        callerUserId,
        ownerUserId: ownedChannel?.user_id,
        recordExists: Boolean(ownedChannel),
      });
      if (decision === 'not_found') {
        return new Response(JSON.stringify({ error: 'Channel not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (decision === 'forbidden' || decision === 'unauthorized') {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    let channelQuery = supabase.from('channels').select('*').eq('settings->>auto_generate_quizzes', 'true').not('telegram_channel_id', 'is', null);
    if (specificChannelId) channelQuery = channelQuery.eq('id', specificChannelId);
    if (!isInternal) {
      if (!callerUserId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      channelQuery = channelQuery.eq('user_id', callerUserId);
    }
    const { data: channels, error: channelsError } = await channelQuery;
    if (channelsError) throw channelsError;
    if (!channels?.length) return new Response(JSON.stringify({ success: true, message: 'No channels configured for auto-generation', processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const aiSettings = await getAISettings(supabase);
    const resolved = resolveAIProvider(aiSettings);
    if (!resolved.apiKey || (resolved.provider === 'cloudflare' && !resolved.accountId)) throw new Error(`AI credentials are missing for ${resolved.provider}. Configure Super Admin → Settings → AI.`);

    const results: Array<Record<string, unknown>> = [];
    for (const channel of channels as Channel[]) {
      try {
        if (!forceGenerate && !(await shouldGenerateForFrequency(supabase, channel.id, channel.settings.generation_frequency))) {
          results.push({ channelId: channel.id, channelName: channel.name, success: true, skipped: true, reason: 'Not due' });
          continue;
        }

        const { data: documents, error: documentsError } = await supabase.from('documents').select('title, extracted_text, ai_summary, topics').eq('channel_id', channel.id).eq('user_id', channel.user_id).eq('processing_status', 'completed').not('extracted_text', 'is', null).limit(10);
        if (documentsError) throw documentsError;
        const knowledgeBase = (documents || []).map((document: any) => `Document: ${document.title}\n${document.ai_summary ? `Summary: ${document.ai_summary}\n` : ''}${document.extracted_text?.substring(0, 2000) || ''}`).join('\n\n---\n\n').substring(0, 8000);
        const topic = channel.settings.default_subject || documents?.[0]?.topics?.[0] || documents?.[0]?.title || channel.name;

        const { data: userPromptData } = await supabase.from('user_ai_system_prompts').select('system_prompt').eq('user_id', channel.user_id).maybeSingle();
        const userSystemPrompt = userPromptData?.system_prompt || '';

        const quiz = await generateQuizForChannel(resolved, aiSettings, channel, topic, knowledgeBase, userSystemPrompt);

        let botToken = channel.telegram_bot_token;
        if (!botToken) {
          const { data: profile } = await supabase.from('profiles').select('telegram_bot_token').eq('id', channel.user_id).maybeSingle();
          botToken = profile?.telegram_bot_token || globalBotToken || null;
        }
        if (!botToken) throw new Error('No Telegram bot token configured.');
        await sendQuizToTelegram(botToken, channel.telegram_channel_id, quiz);

        const { data: generation, error: generationError } = await supabase.from('quiz_generations').insert({
          user_id: channel.user_id,
          channel_id: channel.id,
          topic,
          question_count: quiz.questions.length,
          difficulty: channel.settings.default_difficulty || 'medium',
          questions: quiz.questions,
          metadata: { ...(quiz.metadata || {}), language: channel.settings.default_language || 'en', source_type: knowledgeBase ? 'document' : 'ai', delivery_method: 'telegram', telegram_chat_id: channel.telegram_channel_id, provider: resolved.provider, model: resolved.model },
          status: 'completed',
        }).select().single();
        if (generationError) console.error('[auto-generate-channel-quizzes] Generation log failed:', generationError);
        results.push({ channelId: channel.id, channelName: channel.name, success: true, quizId: generation?.id });
      } catch (error) {
        results.push({ channelId: channel.id, channelName: channel.name, success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }

    const processed = results.filter((result) => result.success && !result.skipped).length;
    const skipped = results.filter((result) => result.skipped).length;
    const failed = results.filter((result) => !result.success).length;
    return new Response(JSON.stringify({ success: true, message: `Processed ${channels.length} channels: ${processed} successful, ${skipped} skipped, ${failed} failed`, processed, skipped, failed, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[auto-generate-channel-quizzes] Error:', error);
    return new Response(JSON.stringify({ error: publicErrorMessage(error, 'Unknown error') }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function shouldGenerateForFrequency(supabase: any, channelId: string, frequency: string): Promise<boolean> {
  const { data: lastGeneration } = await supabase.from('quiz_generations').select('created_at').eq('channel_id', channelId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!lastGeneration) return true;
  const hours = (Date.now() - new Date(lastGeneration.created_at).getTime()) / 3600000;
  if (frequency === 'manual') return false;
  if (frequency === 'weekly') return hours >= 168;
  if (frequency === 'bi-weekly') return hours >= 336;
  if (frequency === 'monthly') return hours >= 720;
  return hours >= 24;
}

async function generateQuizForChannel(resolved: ResolvedAIProvider, aiSettings: AISettings, channel: Channel, topic: string, knowledgeBase: string, userSystemPrompt: string = ''): Promise<any> {
  const count = Math.max(1, Math.min(channel.settings.questions_per_quiz || 10, 50));
  const language = channel.settings.default_language || 'en';
  const difficulty = channel.settings.default_difficulty || 'medium';
  const languageRule = language === 'bn' ? 'Write every question, option and explanation only in Bengali Unicode; do not use English or Devanagari.' : language === 'hi' ? 'Write every question, option and explanation only in Hindi Devanagari; do not use English.' : 'Write all content in clear English.';
  const requestId = crypto.randomUUID();
  const generatedAt = new Date().toISOString();
  const systemPrompt = composeTelePostSystemPrompt({
    platformInstructions: aiSettings.system_prompt,
    userSystemPrompt,
    featureInstructions: channel.settings.system_prompt || '',
    outputRequirements: `You are an expert competitive-exam question setter. ${languageRule} Generate exactly ${count} ${difficulty} MCQs about "${topic}". Each question must have exactly four plausible options and one correct answer. Keep questions under 120 characters, options under 80, explanations under 200, and output only JSON.`,
  });
  const userPrompt = `${knowledgeBase ? `Use only this channel knowledge base:\n${knowledgeBase}\n\n` : ''}Return exactly:\n{\n  "request_id": "${requestId}",\n  "topic": "${topic}",\n  "questions": [{"id": 1, "question": "string", "options": ["string", "string", "string", "string"], "correct_option_index": 0, "explanation": "string"}],\n  "metadata": {"difficulty": "${difficulty}", "generated_at": "${generatedAt}"}\n}`;
  let feedback = '';
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const text = await chatCompletion({ resolved, messages: [{ role: 'system', content: `${systemPrompt}${feedback ? `\nPrevious output failed: ${feedback}` : ''}` }, { role: 'user', content: userPrompt }], temperature: aiSettings.temperature ?? 0.7, maxTokens: 4096, timeoutMs: 90000, appTitle: 'TelePost Auto Quiz' });
      const quiz = parseJsonObject(text) as any;
      if (!Array.isArray(quiz.questions) || quiz.questions.length !== count) { feedback = `Expected exactly ${count} questions.`; continue; }
      const invalid = quiz.questions.find((question: any) => !question?.question || !Array.isArray(question.options) || question.options.length !== 4 || !Number.isInteger(question.correct_option_index) || question.correct_option_index < 0 || question.correct_option_index > 3);
      if (invalid) { feedback = 'Every question needs text, exactly four options, and a valid correct_option_index.'; continue; }
      return quiz;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      feedback = lastError.message;
    }
  }
  throw lastError || new Error('Failed to generate a valid quiz after three attempts.');
}

async function sendQuizToTelegram(botToken: string, chatId: string, quiz: any): Promise<void> {
  let normalizedChatId = chatId;
  if (chatId && !chatId.startsWith('@') && !chatId.startsWith('-100')) {
    const numericId = chatId.replace(/^-/, '');
    if (/^\d+$/.test(numericId)) normalizedChatId = `-100${numericId}`;
  }
  const telegramApiOrigin = 'https:' + '//api.telegram.org';
  const baseUrl = `${telegramApiOrigin}/bot${botToken}`;
  const safeTruncate = (value: string, limit: number) => { const characters = Array.from(value || ''); return characters.length <= limit ? value : characters.slice(0, limit - 3).join('') + '...'; };
  const request = async (url: string, body: Record<string, unknown>) => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (response.status !== 429) return response;
      const data = await response.json();
      await new Promise((resolve) => setTimeout(resolve, (data.parameters?.retry_after || 5) * 1000));
    }
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  };
  await request(`${baseUrl}/sendMessage`, { chat_id: normalizedChatId, text: `New Quiz: ${quiz.topic}\nQuestions: ${quiz.questions.length}\nDifficulty: ${quiz.metadata?.difficulty || 'medium'}` });
  for (let index = 0; index < quiz.questions.length; index++) {
    const question = quiz.questions[index];
    const response = await request(`${baseUrl}/sendPoll`, { chat_id: normalizedChatId, question: safeTruncate(`Q${index + 1}. ${question.question}`, 290), options: question.options.map((option: string) => safeTruncate(option, 95)), type: 'quiz', correct_option_id: question.correct_option_index, explanation: safeTruncate(question.explanation || 'Correct answer explanation', 190), is_anonymous: true });
    if (!response.ok) throw new Error(`Failed to send question ${index + 1}: ${await response.text()}`);
    if (index < quiz.questions.length - 1) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
