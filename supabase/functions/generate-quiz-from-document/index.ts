// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { chatCompletion, resolveAIProvider, type AISettings } from "../_shared/ai-provider.ts";
import {
  appendUnique,
  normalizeQuestions,
  parseQuizPayload,
  planBatches,
  tokenBudget,
  type QuizQuestion,
} from "../_shared/quiz.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_MODEL = 'google/gemini-2.0-flash-001';
const BATCH_SIZE = 10;
const ATTEMPTS_PER_BATCH = 2;
const OVERALL_DEADLINE_MS = 130000;

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

async function getAISettings(supabase: any): Promise<AISettings> {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'ai_settings').maybeSingle();
  return data?.setting_value || { provider: 'openrouter', model: FALLBACK_MODEL, temperature: 0.7 };
}

async function authenticateRequest(req: Request, supabase: any): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    return !error && user ? user.id : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase configuration');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const userId = await authenticateRequest(req, supabase);
    if (!userId) return jsonResponse({ error: 'Authentication required. Please log in.' }, 401);

    const { documentText, topic, questionCount, difficulty = 'medium', language = 'bn' } = await req.json();
    if (!documentText || !questionCount) return jsonResponse({ error: 'Missing required fields: documentText and questionCount' }, 400);

    const count = Math.max(1, Math.min(Number(questionCount) || 10, 50));
    const aiSettings = await getAISettings(supabase);
    const resolved = resolveAIProvider(aiSettings);
    if (!resolved.apiKey || (resolved.provider === 'cloudflare' && !resolved.accountId)) {
      return jsonResponse({ error: `AI \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u0995\u09a8\u09ab\u09bf\u0997\u09be\u09b0 \u0995\u09b0\u09be \u09b9\u09af\u09bc\u09a8\u09bf\u0964 Super Admin Settings \u2192 AI \u099f\u09cd\u09af\u09be\u09ac\u09c7 ${resolved.provider} credentials \u09b8\u09c7\u099f \u0995\u09b0\u09c1\u09a8\u0964` });
    }

    const requestId = crypto.randomUUID();
    const generatedAt = new Date().toISOString();
    const quizTopic = topic || 'Document Quiz';
    const languageName = language === 'en' ? 'English' : language === 'hi' ? 'Hindi (Devanagari)' : 'Bengali';
    const documentContent = String(documentText).substring(0, 12000);
    const startedAt = Date.now();

    const collected: QuizQuestion[] = [];
    let lastError: Error | null = null;
    let lastReason = '';

    for (const batchSize of planBatches(count, BATCH_SIZE)) {
      if (collected.length >= count) break;
      if (Date.now() - startedAt > OVERALL_DEADLINE_MS) {
        console.warn('[generate-quiz-from-document] Deadline reached, returning partial quiz.');
        break;
      }

      const wanted = Math.min(batchSize, count - collected.length);
      const avoidList = collected.slice(-15).map((question) => `- ${question.question}`).join('\n');

      for (let attempt = 1; attempt <= ATTEMPTS_PER_BATCH; attempt++) {
        try {
          const systemPrompt = `${aiSettings.system_prompt || ''}\nYou are an expert competitive-exam question setter. Generate exactly ${wanted} MCQs from the supplied document in ${languageName}. Difficulty: ${difficulty}. Each question must have exactly four plausible options and one correct answer. Keep questions under 120 characters, options under 80, and explanations under 200. Widely used English acronyms and names may stay in Latin script. Reply with JSON only, no commentary.${lastReason ? `\nThe previous attempt was rejected: ${lastReason}` : ''}`;
          const userPrompt = `Topic: ${quizTopic}\n\nDOCUMENT CONTENT:\n${documentContent}\n\n${avoidList ? `Do not repeat these questions:\n${avoidList}\n\n` : ''}Return this exact JSON shape with ${wanted} items:\n{\n  "questions": [{"id": 1, "question": "string", "options": ["string", "string", "string", "string"], "correct_option_index": 0, "explanation": "string"}]\n}`;

          const responseText = await chatCompletion({
            resolved,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: aiSettings.temperature ?? 0.7,
            maxTokens: tokenBudget(wanted),
            timeoutMs: 60000,
            appTitle: 'TelePost Document Quiz',
          });

          const questions = normalizeQuestions(parseQuizPayload(responseText), language);
          if (!questions.length) {
            lastReason = 'No usable questions could be parsed from the response.';
            continue;
          }

          const before = collected.length;
          appendUnique(collected, questions, count);
          if (collected.length > before) { lastReason = ''; break; }
          lastReason = 'All returned questions were duplicates.';
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          lastReason = lastError.message;
          console.error(`[generate-quiz-from-document] Attempt ${attempt} failed: ${lastReason}`);
        }
      }
    }

    if (!collected.length) {
      const message = lastError?.message || lastReason || 'The AI could not produce a valid quiz from this document.';
      console.error('[generate-quiz-from-document] Generation failed:', message);
      return jsonResponse({ error: message });
    }

    const questions = collected.slice(0, count).map((question, index) => ({ ...question, id: index + 1 }));
    return jsonResponse({
      request_id: requestId,
      topic: quizTopic,
      questions,
      metadata: {
        standard: 'Government Competitive Exam Standard',
        difficulty,
        generated_at: generatedAt,
        source: 'document',
        language,
        provider: resolved.provider,
        model: resolved.model,
        requested_count: count,
        returned_count: questions.length,
        partial: questions.length < count,
      },
    });
  } catch (error) {
    console.error('[generate-quiz-from-document] Error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Failed to generate quiz' });
  }
});
