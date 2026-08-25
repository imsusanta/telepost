// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { chatCompletion, parseJsonObject, resolveAIProvider, type AISettings, type ResolvedAIProvider } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

const FALLBACK_MODEL = 'google/gemini-2.0-flash-001';

const TOPIC_LIBRARY = [
  'সিন্ধু সভ্যতা', 'পলাশীর যুদ্ধ', 'ভারতের সংবিধান', 'মৌলিক কর্তব্য', 'ভারতের নদী',
  'ভারতের জলবায়ু', 'কোষ জীববিজ্ঞান', 'মানবদেহ', 'নিউটনের সূত্র', 'অম্ল ও ক্ষার',
  'ভারতীয় অর্থনীতি', 'জিঔসটি', 'রিজার্ভ ব্যাঙ্ক', 'আন্তর্জাতিক সংস্থা', 'ভারতীয় শিল্প ও সংস্কৃতি',
  'মহাকাশ গবেষণা', 'পরিবেশ ও বাস্তুতন্ত্র', 'জাতীয় উদ্যান', 'খেলাধুলা ও পুরস্কার', 'কম্পিউটার সাধারণ জ্ঞান',
];

async function getAISettings(supabase: any): Promise<AISettings> {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'ai_settings').maybeSingle();
  return data?.setting_value || { provider: 'openrouter', model: FALLBACK_MODEL, temperature: 0.7 };
}

function rotatedTopic(channelId: string, slotIndex: number, dayNumber: number): string {
  let hash = 0;
  for (let index = 0; index < channelId.length; index++) hash = ((hash << 5) - hash + channelId.charCodeAt(index)) | 0;
  return TOPIC_LIBRARY[(Math.abs(hash) + dayNumber * 12 + slotIndex) % TOPIC_LIBRARY.length];
}

function getLocalTime(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  return `${parts.find((part) => part.type === 'hour')?.value || '00'}:${parts.find((part) => part.type === 'minute')?.value || '00'}`;
}

function computeScheduledDate(time: string, timeZone: string, now: Date): Date {
  const [hour, minute] = time.substring(0, 5).split(':').map(Number);
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [localHour, localMinute] = getLocalTime(now, timeZone).split(':').map(Number);
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  let offsetMinutes = localHour * 60 + localMinute - utcMinutes;
  if (offsetMinutes > 840) offsetMinutes -= 1440;
  if (offsetMinutes < -840) offsetMinutes += 1440;
  const [year, month, day] = localDate.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day));
  result.setUTCMinutes(hour * 60 + minute - offsetMinutes);
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // AUTH GATE: cron shared secret, service role key (used by pg_cron and
  // internal dispatches), or a signed-in user's JWT.
  //
  // The service role key previously only went through auth.getUser(), which
  // never resolves a user for a service role JWT, so every cron run was 401.
  const cronSecret = Deno.env.get('CRON_SECRET');
  const suppliedCronSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('Authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  let allowed = Boolean(cronSecret && suppliedCronSecret && suppliedCronSecret === cronSecret);
  if (!allowed && bearer && serviceRoleKey && bearer === serviceRoleKey) allowed = true;
  if (!allowed && bearer) {
    try {
      const authClient = createClient(supabaseUrl!, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data } = await authClient.auth.getUser(bearer);
      allowed = Boolean(data?.user);
    } catch { allowed = false; }
  }
  if (!allowed) {
    console.warn('[process-auto-schedule] Unauthorized invocation rejected.');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase configuration');
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    let force = false;
    let targetUserId: string | null = null;
    let previewOnly = false;
    try {
      const body = await req.json();
      force = body.force === true;
      targetUserId = body.userId || null;
      previewOnly = body.previewOnly === true;
    } catch { /* empty cron body */ }

    let settingsQuery = supabase.from('auto_schedule_settings').select('*, channels(name, telegram_channel_id, settings)').eq('enabled', true);
    if (targetUserId) settingsQuery = settingsQuery.eq('user_id', targetUserId);
    const { data: settings, error: settingsError } = await settingsQuery;
    if (settingsError) throw settingsError;
    if (!settings?.length) return new Response(JSON.stringify({ success: true, message: 'No enabled auto-schedules found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const now = new Date();
    const matchingEntries: Array<{ setting: any; matchedTime: string; scheduledDate: Date; slotIndex: number }> = [];
    for (const setting of settings) {
      if (!Array.isArray(setting.schedule_times) || !setting.schedule_times.length) continue;
      const timeZone = setting.timezone || 'Asia/Kolkata';
      const sortedTimes = [...setting.schedule_times].sort();
      if (force) {
        const time = sortedTimes[0] || '09:00';
        matchingEntries.push({ setting, matchedTime: time, scheduledDate: computeScheduledDate(time, timeZone, now), slotIndex: 0 });
        continue;
      }
      const [currentHour, currentMinute] = getLocalTime(now, timeZone).split(':').map(Number);
      const currentTotal = currentHour * 60 + currentMinute;
      for (let index = 0; index < sortedTimes.length; index++) {
        const time = sortedTimes[index];
        const [scheduledHour, scheduledMinute] = time.substring(0, 5).split(':').map(Number);
        let difference = Math.abs(currentTotal - (scheduledHour * 60 + scheduledMinute));
        if (difference > 720) difference = 1440 - difference;
        if (difference <= 2) {
          matchingEntries.push({ setting, matchedTime: time, scheduledDate: computeScheduledDate(time, timeZone, now), slotIndex: index });
          break;
        }
      }
    }
    if (!matchingEntries.length) return new Response(JSON.stringify({ success: true, message: 'No schedules to process', processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const aiSettings = await getAISettings(supabase);
    const resolved = resolveAIProvider(aiSettings);
    if (!resolved.apiKey || (resolved.provider === 'cloudflare' && !resolved.accountId)) throw new Error(`AI credentials are missing for ${resolved.provider}. Configure Super Admin → Settings → AI.`);

    const results: Array<Record<string, unknown>> = [];
    const dayNumber = Math.floor(now.getTime() / 86400000);
    for (const { setting, matchedTime, scheduledDate, slotIndex } of matchingEntries) {
      try {
        if (!force) {
          const from = new Date(scheduledDate.getTime() - 120000).toISOString();
          const to = new Date(scheduledDate.getTime() + 120000).toISOString();
          const { data: existing } = await supabase.from('scheduled_telegram_posts').select('id').eq('user_id', setting.user_id).eq('channel_id', setting.channel_id).gte('scheduled_time', from).lte('scheduled_time', to).in('status', ['pending', 'processing', 'sent']).limit(1);
          if (existing?.length) { results.push({ channel_id: setting.channel_id, success: true, skipped: true, reason: `Already created for ${matchedTime}` }); continue; }
        }

        const customTopics = Array.isArray(setting.topics) ? [...setting.topics].filter(Boolean).sort() : [];
        const finalTopic = customTopics.length ? customTopics[(dayNumber * Math.max(setting.schedule_times?.length || 1, 1) + slotIndex) % customTopics.length] : rotatedTopic(setting.channel_id, slotIndex, dayNumber);
        let questions: any[] = [];
        if (setting.source_type === 'question_bank') {
          let bankQuery = supabase.from('question_banks').select('*').eq('user_id', setting.user_id).eq('channel_id', setting.channel_id).limit(setting.questions_per_post || 5);
          if (customTopics.length) bankQuery = bankQuery.ilike('topic', `%${finalTopic}%`);
          const { data: bankQuestions, error: bankError } = await bankQuery;
          if (bankError) throw bankError;
          questions = bankQuestions || [];
        }
        if (!questions.length) questions = (await generateAIQuiz(setting, finalTopic, aiSettings, resolved, supabase)).questions;

        const language = setting.language || 'bn';
        const quizData = {
          topic: finalTopic,
          language,
          questions: questions.map((question: any, index: number) => ({ id: index + 1, question: question.question, options: question.options, correct_option_index: question.correct_option_index, explanation: question.explanation || '' })),
          metadata: { difficulty: 'medium', generated_at: new Date().toISOString(), source: setting.source_type, language, provider: resolved.provider, model: resolved.model },
        };
        if (previewOnly) { results.push({ channel_id: setting.channel_id, success: true, preview: quizData }); continue; }

        const { error: insertError } = await supabase.from('scheduled_telegram_posts').insert({ user_id: setting.user_id, chat_id: setting.channels?.telegram_channel_id || setting.channel_id, channel_id: setting.channel_id, quiz_data: quizData, scheduled_time: scheduledDate.toISOString(), status: 'pending' });
        if (insertError?.code === '23505') { results.push({ channel_id: setting.channel_id, success: true, skipped: true, reason: 'Duplicate prevented' }); continue; }
        if (insertError) throw insertError;
        results.push({ channel_id: setting.channel_id, success: true, scheduled_time: scheduledDate.toISOString(), question_count: quizData.questions.length });
        fetch(`${supabaseUrl}/functions/v1/process-scheduled-posts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` }, body: JSON.stringify({ triggered_by: 'auto_schedule_generator', force }) }).catch((error) => console.error('[process-auto-schedule] Dispatch failed:', error));
      } catch (error) {
        console.error('[process-auto-schedule] Channel failed:', setting.channel_id, error);
        results.push({ channel_id: setting.channel_id, success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return new Response(JSON.stringify({ success: true, processed: matchingEntries.length, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[process-auto-schedule] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function isValidQuestion(question: any): boolean {
  return Boolean(question?.question)
    && Array.isArray(question.options)
    && question.options.length === 4
    && Number.isInteger(question.correct_option_index)
    && question.correct_option_index >= 0
    && question.correct_option_index <= 3;
}

async function generateAIQuiz(setting: any, topic: string, aiSettings: AISettings, resolved: ResolvedAIProvider, supabase: any): Promise<any> {
  const count = Math.max(1, Math.min(setting.questions_per_post || 5, 50));
  const language = setting.language || 'bn';
  let knowledgeBase = '';
  if (setting.source_type === 'knowledge_base' && setting.channel_id) {
    const { data: documents } = await supabase.from('documents').select('title, extracted_text').eq('channel_id', setting.channel_id).eq('processing_status', 'completed').limit(10);
    knowledgeBase = (documents || []).map((document: any) => `Document: ${document.title}\n${document.extracted_text?.substring(0, 2000) || ''}`).join('\n\n---\n\n').substring(0, 8000);
  }
  const languageRule = language === 'bn'
    ? 'Write questions, options and explanations in Bengali. Widely used English acronyms, names and units may stay in Latin script.'
    : language === 'hi'
      ? 'Write questions, options and explanations in Hindi (Devanagari). Widely used English acronyms, names and units may stay in Latin script.'
      : 'Write all content in clear English.';
  const systemPrompt = `${aiSettings.system_prompt || ''}\n${setting.custom_prompt || ''}\nYou are an expert competitive-exam question setter. ${languageRule} Generate exactly ${count} MCQs strictly about "${topic}". Each question must have exactly four plausible options and one correct answer. Keep explanations concise and output only JSON.`;
  const userPrompt = `${knowledgeBase ? `Use only this knowledge base:\n${knowledgeBase}\n\n` : ''}Return exactly: {"questions":[{"question":"string","options":["string","string","string","string"],"correct_option_index":0,"explanation":"string"}]}`;

  // Token budget must scale with the question count: a fixed 4096 truncated the
  // JSON for larger Bengali/Hindi batches, which failed every attempt.
  const maxTokens = Math.min(8192, 800 + count * 420);

  let feedback = '';
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const text = await chatCompletion({
        resolved,
        messages: [
          { role: 'system', content: `${systemPrompt}${feedback ? `\nPrevious output failed: ${feedback}` : ''}` },
          { role: 'user', content: userPrompt },
        ],
        temperature: aiSettings.temperature ?? 0.7,
        maxTokens,
        timeoutMs: 90000,
        appTitle: 'TelePost Auto Schedule',
      });
      const quiz = parseJsonObject(text) as any;
      const valid = Array.isArray(quiz?.questions) ? quiz.questions.filter(isValidQuestion) : [];
      if (!valid.length) {
        feedback = 'Every question needs exactly four options and a valid correct_option_index.';
        continue;
      }
      // Accept a partial batch rather than dropping a usable quiz entirely.
      if (valid.length < count) {
        console.warn(`[process-auto-schedule] Partial quiz for "${topic}": ${valid.length}/${count} questions.`);
      }
      return { ...quiz, questions: valid.slice(0, count) };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      feedback = lastError.message;
      console.error(`[process-auto-schedule] Quiz attempt ${attempt} failed: ${feedback}`);
    }
  }
  throw lastError || new Error('Failed to generate a valid scheduled quiz after three attempts.');
}

export async function generateAITopic(setting: any, aiSettings: AISettings, slotIndex: number, resolved: ResolvedAIProvider = resolveAIProvider(aiSettings)): Promise<string> {
  const language = setting.language || 'bn';
  const languageRule = language === 'bn' ? 'Output only a short Bengali topic in Bengali script.' : language === 'hi' ? 'Output only a short Hindi topic in Devanagari.' : 'Output only a short English topic.';
  const subject = TOPIC_LIBRARY[slotIndex % TOPIC_LIBRARY.length];
  const text = await chatCompletion({ resolved, messages: [{ role: 'system', content: `${languageRule} No quotes or extra text.` }, { role: 'user', content: `Suggest one specific competitive-exam quiz topic related to ${subject}. Maximum five words.` }], temperature: aiSettings.temperature ?? 0.7, maxTokens: 64, timeoutMs: 45000, appTitle: 'TelePost Auto Topic' });
  return text.trim().replace(/^['"]|['"]$/g, '');
}
