// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OpenRouter configuration
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_FALLBACK_MODEL = 'google/gemini-2.0-flash-exp:free';
const RELIABLE_FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/pixtral-12b:free',
  'deepseek/deepseek-chat:free'
];

// Models known to be dead/removed from OpenRouter
const DEAD_OPENROUTER_MODELS = ['arcee-ai/'];

interface AISettings {
  provider: 'openrouter' | 'lovable' | 'gemini' | 'openai';
  model: string;
  temperature: number;
  openrouter_api_key?: string;
  gemini_api_key?: string;
  openai_api_key?: string;
  system_prompt?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAISettings(supabase: any): Promise<AISettings> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_settings')
      .maybeSingle();

    if (data?.setting_value) {
      return data.setting_value as AISettings;
    }
  } catch (error) {
    console.error("Failed to fetch AI settings:", error);
  }

  return {
    provider: 'openrouter',
    model: 'google/gemini-2.0-flash-exp:free',
    temperature: 0.7,
    openrouter_api_key: '',
    gemini_api_key: '',
    openai_api_key: '',
    system_prompt: '',
  };
}

/**
 * Resolve the best available provider + API key + model.
 */
function resolveProvider(aiSettings: AISettings): { finalProvider: string; apiKey: string; model: string } {
  const provider = aiSettings.provider || 'openrouter';
  let apiKey = '';
  let finalProvider = provider;
  let model = aiSettings.model;

  const effectiveProvider = provider === 'lovable' ? 'openrouter' : provider;

  if (effectiveProvider === 'gemini' && aiSettings.gemini_api_key) {
    apiKey = aiSettings.gemini_api_key;
    finalProvider = 'gemini';
  } else if (effectiveProvider === 'openai' && aiSettings.openai_api_key) {
    apiKey = aiSettings.openai_api_key;
    finalProvider = 'openai';
  } else if ((effectiveProvider === 'openrouter' || effectiveProvider === 'lovable') && aiSettings.openrouter_api_key) {
    apiKey = aiSettings.openrouter_api_key;
    finalProvider = 'openrouter';
  }

  if (!apiKey) {
    console.warn(`[generate-quiz-from-doc] No API key for ${effectiveProvider}, trying fallbacks...`);
    if (aiSettings.openrouter_api_key) {
      apiKey = aiSettings.openrouter_api_key;
      finalProvider = 'openrouter';
      if (!model.includes('/')) model = OPENROUTER_FALLBACK_MODEL;
    } else if (aiSettings.gemini_api_key) {
      apiKey = aiSettings.gemini_api_key;
      finalProvider = 'gemini';
      model = 'gemini-2.0-flash';
    } else if (aiSettings.openai_api_key) {
      apiKey = aiSettings.openai_api_key;
      finalProvider = 'openai';
      model = 'gpt-4o-mini';
    }
  }

  // Validate OpenRouter model — fallback if dead
  if (finalProvider === 'openrouter') {
    const isDead = DEAD_OPENROUTER_MODELS.some(dead => model.startsWith(dead) || model === dead);
    if (isDead) {
      console.warn(`[generate-quiz-from-doc] Model "${model}" is dead, using fallback: ${OPENROUTER_FALLBACK_MODEL}`);
      model = OPENROUTER_FALLBACK_MODEL;
    }
  }

  return { finalProvider, apiKey, model };
}

/**
 * Authenticate request — returns user ID or null
 */
async function authenticateRequest(req: Request, supabase: any): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  // Method 1: JWT parsing
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.sub) return payload.sub;
  } catch { /* ignore */ }

  // Method 2: supabase auth.getUser
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) return user.id;
  } catch { /* ignore */ }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- AUTHENTICATION CHECK ---
    const userId = await authenticateRequest(req, supabase);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required. Please log in." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { documentText, topic, questionCount, difficulty, language } = await req.json();

    if (!documentText || !questionCount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: documentText and questionCount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiSettings = await getAISettings(supabase);
    const { finalProvider, apiKey, model: resolvedModel } = resolveProvider(aiSettings);

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: `AI সার্ভিস কনফিগার করা হয়নি। Super Admin Settings → AI ট্যাবে গিয়ে আপনার API Key সেট করুন।`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-quiz-from-doc] user=${userId}, provider=${finalProvider}, model=${resolvedModel}`);

    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();

    const languageInstructions = language === 'en'
      ? 'English'
      : language === 'hi'
        ? 'Hindi (हिन्दी)'
        : 'Bengali (বাংলা)';

    const baseSystemPromptFinal = (aiSettings.system_prompt || "") + `You are a Quiz Maker. Output ONLY valid JSON containing the specified number of questions based on the content.
    No preamble, no markdown. 
    
    CRITICAL TELEGRAM LIMITS (STRICT):
    - Question text: Keep under 120 characters (Max 300).
    - Each option text: Keep under 80 characters (Max 100).
    - Explanation text: Keep under 200 characters.`;

    const userPrompt = `Create a multiple-choice quiz based on this content. 
    Language: ${languageInstructions}
    Question Count: ${questionCount}
    Topic: ${topic || 'General'}
    Difficulty: ${difficulty || 'medium'}

    CONTENT:
    ${documentText.substring(0, 4000)}

    OUTPUT FORMAT (JSON ONLY):
    {
      "request_id": "${requestId}",
      "topic": "${topic || 'Document Quiz'}",
      "questions": [
        {
          "id": 1,
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correct_option_index": 0,
          "explanation": "string"
        }
      ],
      "metadata": {
        "difficulty": "${difficulty || 'medium'}",
        "generated_at": "${now}",
        "source": "document"
      }
    }`;

    console.log(`Calling ${finalProvider} for topic "${topic || 'Document'}" with model ${resolvedModel}...`);
    const startTime = Date.now();
    let content = '';

    if (finalProvider === 'gemini') {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`;
      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${baseSystemPromptFinal}\n\nUSER PROMPT: ${userPrompt}` }]
          }],
          generationConfig: {
            temperature: aiSettings.temperature || 0.7,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("Gemini Direct Error:", errorText);
        throw new Error(`Gemini API error (${geminiResponse.status}): ${errorText.substring(0, 200)}`);
      }
      const geminiData = await geminiResponse.json();
      content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (finalProvider === 'openai') {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: resolvedModel,
          messages: [
            { role: "system", content: baseSystemPromptFinal },
            { role: "user", content: userPrompt }
          ],
          temperature: aiSettings.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI Direct Error:", errorText);
        throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`);
      }
      const data = await response.json();
      content = data.choices?.[0]?.message?.content;
    } else {
      // OpenRouter with retry-on-dead-model
      const makeRequest = async (useModel: string) => {
        const response = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": supabaseUrl,
            "X-Title": "TelePost QuizMaker",
          },
          body: JSON.stringify({
            model: useModel,
            messages: [
              { role: "system", content: baseSystemPromptFinal },
              { role: "user", content: userPrompt }
            ],
            temperature: aiSettings.temperature || 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `AI Service failure (${response.status})`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
          } catch {
            errorMessage = errorText.substring(0, 300) || errorMessage;
          }
          return { ok: false as const, errorMessage };
        }

        const aiData = await response.json();
        return { ok: true as const, content: aiData.choices?.[0]?.message?.content || '' };
      };

      let result = await makeRequest(resolvedModel);

      // Auto-retry with fallback if model is dead or no endpoints found
      if (!result.ok && (result.errorMessage?.includes("No endpoints found") || result.errorMessage?.includes("404") || result.errorMessage?.includes("403"))) {
        console.warn(`[generate-quiz-from-doc] Model "${resolvedModel}" failed/dead. Trying reliable fallbacks...`);
        
        for (const fallbackModel of RELIABLE_FREE_MODELS) {
          if (fallbackModel === resolvedModel) continue;
          console.log(`[generate-quiz-from-doc] Retrying with fallback: ${fallbackModel}`);
          result = await makeRequest(fallbackModel);
          if (result.ok) {
            console.log(`[generate-quiz-from-doc] Fallback success: ${fallbackModel}`);
            break;
          }
        }
      }

      if (!result.ok) {
        return new Response(
          JSON.stringify({ error: `${result.errorMessage} [Model: ${resolvedModel}]` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      content = result.content;
    }

    console.log(`AI responded in ${Date.now() - startTime}ms`);

    if (!content) throw new Error("Empty AI response — the model returned no content. Try a different model.");

    // Robust JSON extraction
    let quizData;
    try {
      let cleanedContent = content.trim();
      const jsonStart = cleanedContent.indexOf('{');
      const jsonEnd = cleanedContent.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
      }

      if (cleanedContent.includes('```')) {
        cleanedContent = cleanedContent.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      }

      quizData = JSON.parse(cleanedContent);
    } catch (e) {
      console.error("Parse error. Content snippet:", content.substring(0, 100));
      throw new Error(`Invalid JSON from AI: ${e instanceof Error ? e.message : 'Parse failed'}`);
    }

    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error("Invalid quiz structure returned");
    }

    return new Response(JSON.stringify(quizData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate quiz" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
