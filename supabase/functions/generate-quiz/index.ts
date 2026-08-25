// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { chatCompletion, resolveAIProvider, type AISettings } from "../_shared/ai-provider.ts";
import { appendUnique, normalizeQuestions, parseQuizPayload, planBatches, tokenBudget, type QuizQuestion } from "../_shared/quiz.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_MODEL = 'google/gemini-2.0-flash-001';
const BATCH_SIZE = 10;
const ATTEMPTS_PER_BATCH = 3;
const OVERALL_DEADLINE_MS = 130000;

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

async function getAISettings(supabase: any): Promise<AISettings> {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'ai_settings').maybeSingle();
  return data?.setting_value || { provider: 'openrouter', model: FALLBACK_MODEL, temperature: 0.7 };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase configuration');

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) return jsonResponse({ error: 'Authentication failed. Please log in again.' }, 401);

    const {
      topic,
      questionCount = 10,
      difficulty = 'medium',
      systemPrompt = '',
      language = 'bn',
      channelId,
      useChannelKnowledgeBase = false,
    } = await req.json();
    if (!topic || typeof topic !== 'string') return jsonResponse({ error: 'Topic is required' }, 400);

    // If the topic itself is written in Bengali, always honor Bengali output.
    const hasBengaliScript = /[\u0980-\u09FF]/.test(topic);
    const effectiveLanguage = hasBengaliScript ? 'bn' : (language === 'hi' || language === 'en' ? language : 'bn');

    const count = Math.max(1, Math.min(Number(questionCount) || 10, 50));
    const aiSettings = await getAISettings(supabase);
    const resolved = resolveAIProvider(aiSettings);
    if (!resolved.apiKey || (resolved.provider === 'cloudflare' && !resolved.accountId)) {
      return jsonResponse({ error: `AI service is not configured. Please set ${resolved.provider} credentials in Super Admin Settings → AI.` });
    }

    let knowledgeBaseContext = '';
    let channelSystemPrompt = '';
    if (channelId && useChannelKnowledgeBase) {
      const { data: channel } = await supabase.from('channels').select('settings, user_id').eq('id', channelId).single();
      if (channel?.user_id === user.id) {
        channelSystemPrompt = channel.settings?.system_prompt || '';
        const { data: documents } = await supabase.from('documents').select('title, extracted_text').eq('channel_id', channelId).eq('processing_status', 'completed').limit(10);
        knowledgeBaseContext = (documents || []).map((document: any) => `Document: ${document.title}\n${document.extracted_text?.substring(0, 2000) || ''}`).join('\n\n---\n\n').substring(0, 8000);
      }
    }

    const languageRules: Record<string, string> = {
      bn: `IMPORTANT LANGUAGE RULE: পুরো quiz বাংলা ভাষায় লিখুন। প্রশ্ন, চারটি option এবং explanation—সবই বাংলায় হবে। ইংরেজি শুধু proper noun, official name, acronym, formula, unit বা প্রচলিত exam term-এর ক্ষেত্রে ব্যবহার করা যাবে। বাংলা বাক্যকে ইংরেজিতে translate করবেন না। বাংলা script ব্যবহার করুন।`,
      hi: 'Write questions, options and explanations in Hindi (Devanagari). Widely used English acronyms, names and units may stay in Latin script.',
      en: 'Write all content in clear English.',
    };

    const requestId = crypto.randomUUID();
    const generatedAt = new Date().toISOString();
    const startedAt = Date.now();
    const collected: QuizQuestion[] = [];
    const batches = planBatches(count, BATCH_SIZE);
    let lastError: Error | null = null;
    let lastReason = '';

    for (const batchSize of batches) {
      if (collected.length >= count) break;
      if (Date.now() - startedAt > OVERALL_DEADLINE_MS) break;

      const wanted = Math.min(batchSize, count - collected.length);
      const avoidList = collected.slice(-15).map((question) => `- ${question.question}`).join('\n');

      for (let attempt = 1; attempt <= ATTEMPTS_PER_BATCH; attempt++) {
        try {
          const baseSystemPrompt = `${aiSettings.system_prompt || ''}\n${channelSystemPrompt || systemPrompt}\nYou are an expert Indian competitive-exam question setter.\n${languageRules[effectiveLanguage]}\nGenerate exactly ${wanted} high-quality MCQs about "${topic}" at ${difficulty} difficulty. Each question must have exactly four plausible options and one correct answer. Avoid all/none-of-the-above. Keep questions under 120 characters, options under 80, and explanations under 200. Focus on WBCS, WBP, SSC, Railway, Banking and other Indian government exams. Return JSON only, no markdown or commentary.\n\nBefore returning the JSON, silently verify that every question, every option and every explanation follows the requested language. If Bengali is requested, reject and rewrite any English sentence. ${lastReason ? `Previous attempt failed validation: ${lastReason}` : ''}`;
          const userPrompt = `${knowledgeBaseContext ? `Use only this context:\n${knowledgeBaseContext}\n\n` : ''}${avoidList ? `Do not repeat these questions:\n${avoidList}\n\n` : ''}Create ${wanted} MCQs. The output must be valid JSON in exactly this shape:\n{"questions":[{"id":1,"question":"...","options":["...","...","...","..."],"correct_option_index":0,"explanation":"..."}]}\nFor Bengali mode, the visible text must be Bengali, not English translation.`;

          const text = await chatCompletion({
            resolved,
            messages: [
              { role: 'system', content: baseSystemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: effectiveLanguage === 'bn' ? 0.35 : (aiSettings.temperature ?? 0.7),
            maxTokens: tokenBudget(wanted),
            timeoutMs: 60000,
            appTitle: 'TelePost QuizMaker',
          });

          const questions = normalizeQuestions(parseQuizPayload(text), effectiveLanguage);
          if (!questions.length) {
            lastReason = effectiveLanguage === 'bn' ? 'The response was not sufficiently Bengali or did not match the quiz schema.' : 'No usable questions could be parsed from the response.';
            continue;
          }

          const before = collected.length;
          appendUnique(collected, questions, count);
          if (collected.length > before) { lastReason = ''; break; }
          lastReason = 'All returned questions were duplicates.';
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          lastReason = lastError.message;
          console.error(`[generate-quiz] Attempt ${attempt} failed: ${lastReason}`);
        }
      }
    }

    if (!collected.length) {
      const message = lastError?.message || lastReason || 'The AI could not produce a valid quiz. Try a simpler topic or fewer questions.';
      console.error('[generate-quiz] Generation failed:', message);
      return jsonResponse({ error: message });
    }

    const questions = collected.slice(0, count).map((question, index) => ({ ...question, id: index + 1 }));
    const quizData = {
      request_id: requestId,
      topic,
      questions,
      metadata: {
        standard: 'Government Competitive Exam Standard',
        difficulty,
        generated_at: generatedAt,
        language: effectiveLanguage,
        provider: resolved.provider,
        model: resolved.model,
        requested_count: count,
        returned_count: questions.length,
        partial: questions.length < count,
      },
    };

    if (questions.length < count) console.warn(`[generate-quiz] Partial quiz: ${questions.length}/${count} questions.`);

    try {
      await supabase.from('quiz_generations').insert({
        user_id: user.id,
        channel_id: channelId || null,
        request_id: requestId,
        topic: topic.substring(0, 200),
        question_count: questions.length,
        questions,
        metadata: { ...quizData.metadata, used_knowledge_base: Boolean(knowledgeBaseContext) },
        status: 'completed',
      });
      await supabase.rpc('increment_quiz_count', { p_user_id: user.id });
    } catch (databaseError) {
      console.warn('[generate-quiz] Failed to save generation:', databaseError);
    }

    return jsonResponse(quizData);
  } catch (error) {
    console.error('[generate-quiz] Error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Internal error' });
  }
});
