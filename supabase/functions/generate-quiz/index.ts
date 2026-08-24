// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  chatCompletion,
  parseJsonObject,
  resolveAIProvider,
  type AISettings,
} from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAISettings(supabase: any): Promise<AISettings> {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'ai_settings').maybeSingle();
  return data?.setting_value || { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free', temperature: 0.7 };
}

function validateQuiz(data: any, language: string, expectedCount: number): { valid: boolean; reason?: string } {
  if (!Array.isArray(data?.questions) || data.questions.length !== expectedCount) {
    return { valid: false, reason: `Expected exactly ${expectedCount} questions.` };
  }
  const english = /[a-zA-Z]/;
  const foreignIndic = /[\u0900-\u097F\u0A00-\u0B7F\u0B80-\u0DFF]/;
  for (let index = 0; index < data.questions.length; index++) {
    const question = data.questions[index];
    if (!question?.question || !Array.isArray(question.options) || question.options.length !== 4) {
      return { valid: false, reason: `Question ${index + 1} must contain text and exactly four options.` };
    }
    if (!Number.isInteger(question.correct_option_index) || question.correct_option_index < 0 || question.correct_option_index > 3) {
      return { valid: false, reason: `Question ${index + 1} has an invalid correct_option_index.` };
    }
    const fields = [question.question, ...question.options, question.explanation || ''];
    if (language === 'bn' && fields.some((value) => english.test(value) || foreignIndic.test(value))) {
      return { valid: false, reason: `Question ${index + 1} contains non-Bengali script.` };
    }
    if (language === 'hi' && fields.some((value) => english.test(value))) {
      return { valid: false, reason: `Question ${index + 1} contains English script.` };
    }
  }
  return { valid: true };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase configuration');

    const authClient = createClient(supabaseUrl, serviceRoleKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await authClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) return new Response(JSON.stringify({ error: 'Authentication failed. Please log in again.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const {
      topic,
      questionCount = 10,
      difficulty = 'medium',
      systemPrompt = '',
      language = 'bn',
      channelId,
      useChannelKnowledgeBase = false,
    } = await req.json();
    if (!topic || typeof topic !== 'string') return new Response(JSON.stringify({ error: 'Topic is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const count = Math.max(1, Math.min(Number(questionCount) || 10, 50));
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const aiSettings = await getAISettings(supabase);
    const resolved = resolveAIProvider(aiSettings);
    if (!resolved.apiKey || (resolved.provider === 'cloudflare' && !resolved.accountId)) {
      return new Response(JSON.stringify({ error: `AI সার্ভিস কনফিগার করা হয়নি। Super Admin Settings → AI ট্যাবে ${resolved.provider} credentials সেট করুন।` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      bn: 'Write every question, option, topic and explanation only in Bengali Unicode. Do not use English or Devanagari characters.',
      hi: 'Write every question, option, topic and explanation only in Hindi Devanagari. Do not use English characters.',
      en: 'Write all content in clear English.',
    };
    const requestId = crypto.randomUUID();
    const generatedAt = new Date().toISOString();
    const baseSystemPrompt = `${aiSettings.system_prompt || ''}\n${channelSystemPrompt || systemPrompt}\nYou are an expert competitive-exam question setter. ${languageRules[language] || languageRules.bn}\nGenerate exactly ${count} high-quality MCQs about "${topic}" at ${difficulty} difficulty. Each question must have exactly four plausible options and one correct answer. Avoid all/none-of-the-above. Keep questions under 120 characters, options under 80, and explanations under 200. Focus on Indian competitive exams. Output only JSON.`;
    const userPrompt = `${knowledgeBaseContext ? `Use only this context:\n${knowledgeBaseContext}\n\n` : ''}Return this exact JSON shape:\n{\n  "request_id": "${requestId}",\n  "topic": "${topic}",\n  "questions": [{"id": 1, "question": "string", "options": ["string", "string", "string", "string"], "correct_option_index": 0, "explanation": "string"}],\n  "metadata": {"standard": "Government Competitive Exam Standard", "difficulty": "${difficulty}", "generated_at": "${generatedAt}"}\n}`;

    let quizData: any = null;
    let feedback = '';
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const text = await chatCompletion({
          resolved,
          messages: [
            { role: 'system', content: `${baseSystemPrompt}${feedback ? `\nPrevious output failed: ${feedback}` : ''}` },
            { role: 'user', content: userPrompt },
          ],
          temperature: aiSettings.temperature ?? 0.7,
          maxTokens: 4096,
          timeoutMs: 90000,
          appTitle: 'TelePost QuizMaker',
        });
        const parsed = parseJsonObject(text);
        const validation = validateQuiz(parsed, language, count);
        if (!validation.valid) { feedback = validation.reason || 'Invalid quiz output.'; continue; }
        quizData = parsed;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        feedback = lastError.message;
      }
    }
    if (!quizData) throw lastError || new Error('Failed to generate a valid quiz after three attempts.');

    try {
      await supabase.from('quiz_generations').insert({
        user_id: user.id,
        channel_id: channelId || null,
        request_id: requestId,
        topic: topic.substring(0, 200),
        question_count: quizData.questions.length,
        questions: quizData.questions,
        metadata: { ...(quizData.metadata || {}), language, used_knowledge_base: Boolean(knowledgeBaseContext), provider: resolved.provider, model: resolved.model },
        status: 'completed',
      });
      await supabase.rpc('increment_quiz_count', { p_user_id: user.id });
    } catch (databaseError) {
      console.warn('[generate-quiz] Failed to save generation:', databaseError);
    }

    return new Response(JSON.stringify(quizData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[generate-quiz] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
