// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { chatCompletion, parseJsonObject, resolveAIProvider, type AISettings } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAISettings(supabase: any): Promise<AISettings> {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'ai_settings').maybeSingle();
  return data?.setting_value || { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free', temperature: 0.7 };
}

async function authenticateRequest(req: Request, supabase: any): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    return !error && user ? user.id : null;
  } catch { return null; }
}

function validateQuiz(data: any, expectedCount: number): { valid: boolean; reason?: string } {
  if (!Array.isArray(data?.questions) || data.questions.length !== expectedCount) return { valid: false, reason: `Expected exactly ${expectedCount} questions.` };
  for (let index = 0; index < data.questions.length; index++) {
    const question = data.questions[index];
    if (!question?.question || !Array.isArray(question.options) || question.options.length !== 4) return { valid: false, reason: `Question ${index + 1} must have text and exactly four options.` };
    if (!Number.isInteger(question.correct_option_index) || question.correct_option_index < 0 || question.correct_option_index > 3) return { valid: false, reason: `Question ${index + 1} has an invalid correct option.` };
  }
  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase configuration');
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const userId = await authenticateRequest(req, supabase);
    if (!userId) return new Response(JSON.stringify({ error: 'Authentication required. Please log in.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { documentText, topic, questionCount, difficulty = 'medium', language = 'bn' } = await req.json();
    if (!documentText || !questionCount) return new Response(JSON.stringify({ error: 'Missing required fields: documentText and questionCount' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const count = Math.max(1, Math.min(Number(questionCount) || 10, 50));
    const aiSettings = await getAISettings(supabase);
    const resolved = resolveAIProvider(aiSettings);
    if (!resolved.apiKey || (resolved.provider === 'cloudflare' && !resolved.accountId)) {
      return new Response(JSON.stringify({ error: `AI সার্ভিস কনফিগার করা হয়নি। Super Admin Settings → AI ট্যাবে ${resolved.provider} credentials সেট করুন।` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const requestId = crypto.randomUUID();
    const generatedAt = new Date().toISOString();
    const languageName = language === 'en' ? 'English' : language === 'hi' ? 'Hindi (हिन्दी)' : 'Bengali (বাংলা)';
    const systemPrompt = `${aiSettings.system_prompt || ''}\nYou are an expert competitive-exam question setter. Generate exactly ${count} MCQs from the supplied document in ${languageName}. Difficulty: ${difficulty}. Each question must have exactly four plausible options and one correct answer. Keep questions under 120 characters, options under 80, and explanations under 200. Focus on Indian competitive exams. Output only valid JSON.`;
    const userPrompt = `Topic: ${topic || 'Document Quiz'}\n\nDOCUMENT CONTENT:\n${String(documentText).substring(0, 12000)}\n\nReturn exactly this JSON shape:\n{\n  "request_id": "${requestId}",\n  "topic": "${topic || 'Document Quiz'}",\n  "questions": [{"id": 1, "question": "string", "options": ["string", "string", "string", "string"], "correct_option_index": 0, "explanation": "string"}],\n  "metadata": {"standard": "Government Competitive Exam Standard", "difficulty": "${difficulty}", "generated_at": "${generatedAt}", "source": "document"}\n}`;

    let quizData: any = null;
    let feedback = '';
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const responseText = await chatCompletion({
          resolved,
          messages: [
            { role: 'system', content: `${systemPrompt}${feedback ? `\nPrevious output failed: ${feedback}` : ''}` },
            { role: 'user', content: userPrompt },
          ],
          temperature: aiSettings.temperature ?? 0.7,
          maxTokens: 4096,
          timeoutMs: 90000,
          appTitle: 'TelePost Document Quiz',
        });
        const parsed = parseJsonObject(responseText);
        const validation = validateQuiz(parsed, count);
        if (!validation.valid) { feedback = validation.reason || 'Invalid quiz data.'; continue; }
        quizData = parsed;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        feedback = lastError.message;
      }
    }

    if (!quizData) throw lastError || new Error('Failed to generate a valid document quiz after three attempts.');
    quizData.metadata = { ...(quizData.metadata || {}), provider: resolved.provider, model: resolved.model };
    return new Response(JSON.stringify(quizData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[generate-quiz-from-document] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate quiz' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
