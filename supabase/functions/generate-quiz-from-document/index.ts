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

  // Add fallback if model is empty to prevent API errors
  if (!model || model.trim() === '') {
      if (provider === 'gemini') model = 'gemini-2.0-flash';
      else if (provider === 'openai') model = 'gpt-4o-mini';
      else model = 'google/gemini-2.0-flash-exp:free';
  }

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

  // Auto-detect: if model name has 'gemini' and we have a gemini key, prefer direct Gemini
  if (model && model.toLowerCase().includes('gemini') && !model.includes('/') && aiSettings.gemini_api_key) {
      apiKey = aiSettings.gemini_api_key;
      finalProvider = 'gemini';
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
    let text = "";
    let lastError = null;

    async function attemptGeneration(currentModel: string, currentProvider: string, currentApiKey: string) {
      if (currentProvider === 'gemini') {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${currentApiKey}`;
        const geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${baseSystemPromptFinal}\n\nUSER PROMPT: ${userPrompt}` }] }],
            generationConfig: { temperature: aiSettings.temperature || 0.7, maxOutputTokens: 2048 }
          })
        });

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          throw new Error(`Gemini API error (${geminiResponse.status}): ${errorText.substring(0, 200)}`);
        }
        const geminiData = await geminiResponse.json();
        const resText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!resText) throw new Error("Gemini returned empty response");
        return resText;
      }

      const fetchUrl = currentProvider === 'openai' ? "https://api.openai.com/v1/chat/completions" : OPENROUTER_URL;
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${currentApiKey}`,
        "Content-Type": "application/json",
      };
      if (currentProvider !== 'openai') {
        headers["HTTP-Referer"] = "https://telepost.io";
        headers["X-Title"] = "TelePost QuizMaker";
      }

      const res = await fetch(fetchUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: "system", content: baseSystemPromptFinal },
            { role: "user", content: userPrompt }
          ],
          temperature: aiSettings.temperature || 0.7,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${currentProvider} error: ${err.substring(0, 200)}`);
      }

      const data = await res.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      } else {
        throw new Error(`Empty response from ${currentProvider}`);
      }
    }

    // Helper validation function
    function validateQuizData(data: any): { valid: boolean; reason?: string } {
      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        return { valid: false, reason: "Quiz structure is missing 'questions' array or is empty." };
      }

      const forbiddenIndicRegex = /[\u0900-\u097F\u0A00-\u0B7F\u0B80-\u0DFF]/;
      const englishLetterRegex = /[a-zA-Z]/;
      const dottedCircleRegex = /[\u25CC◌]/;
      const invalidVowelPlacement = /(?:^|[\s\d০-৯\-\(\)\.,!?;:\"\'\[\]{}|])[\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CC\u09D7]/;
      const consecutiveVowels = /[\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CC\u09D7]{2,}/;
      const viramaVowelConflict = /[\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CC\u09D7]\u09CD|\u09CD[\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CC\u09D7]/;

      const checkFieldText = (val: string, label: string): { valid: boolean; reason?: string } => {
        if (typeof val !== "string") return { valid: true };
        
        if (language === 'bn') {
          if (forbiddenIndicRegex.test(val)) {
            return { valid: false, reason: `${label} contains foreign/non-Bengali script characters (e.g., "${val.match(forbiddenIndicRegex)?.[0]}")` };
          }
          if (englishLetterRegex.test(val)) {
            return { valid: false, reason: `${label} contains English/Latin letters (e.g., "${val.match(englishLetterRegex)?.[0]}")` };
          }
          if (dottedCircleRegex.test(val)) {
            return { valid: false, reason: `${label} contains a broken combining vowel mark rendering as a dotted circle (◌)` };
          }
          if (invalidVowelPlacement.test(val)) {
            return { valid: false, reason: `${label} contains a combining vowel sign positioned incorrectly (e.g., after space or punctuation)` };
          }
          if (consecutiveVowels.test(val)) {
            return { valid: false, reason: `${label} contains consecutive combining vowel signs (invalid layout)` };
          }
          if (viramaVowelConflict.test(val)) {
            return { valid: false, reason: `${label} contains a virama directly conflicting with a combining vowel sign` };
          }
        } else if (language === 'hi') {
          if (englishLetterRegex.test(val)) {
            return { valid: false, reason: `${label} contains English/Latin letters (e.g., "${val.match(englishLetterRegex)?.[0]}")` };
          }
          if (dottedCircleRegex.test(val)) {
            return { valid: false, reason: `${label} contains a broken combining vowel mark rendering as a dotted circle (◌)` };
          }
        }
        return { valid: true };
      };

      if (data.topic) {
        const topicCheck = checkFieldText(data.topic, "Topic title");
        if (!topicCheck.valid) return topicCheck;
      }

      for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i];
        const qLabel = `Question ${i + 1}`;

        if (!q.question) {
          return { valid: false, reason: `${qLabel} is missing question text.` };
        }
        const qCheck = checkFieldText(q.question, `${qLabel} text`);
        if (!qCheck.valid) return qCheck;

        if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
          return { valid: false, reason: `${qLabel} must have exactly 4 options.` };
        }

        for (let j = 0; j < q.options.length; j++) {
          const optCheck = checkFieldText(q.options[j], `${qLabel} Option ${j + 1}`);
          if (!optCheck.valid) return optCheck;
        }

        if (q.explanation) {
          const expCheck = checkFieldText(q.explanation, `${qLabel} explanation`);
          if (!expCheck.valid) return expCheck;
        }

        if (typeof q.correct_option_index !== 'number' || q.correct_option_index < 0 || q.correct_option_index > 3) {
          return { valid: false, reason: `${qLabel} correct_option_index must be between 0 and 3.` };
        }
      }

      return { valid: true };
    }

    // Try generation with retry/regeneration loop (up to 3 attempts)
    let quizData = null;
    let feedback = "";
    const maxAttempts = 3;
    let currentModelToUse = resolvedModel;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[generate-quiz-from-doc] Generation attempt ${attempt}/${maxAttempts} using ${currentModelToUse}...`);
        text = await attemptGeneration(currentModelToUse, finalProvider, apiKey);
        
        if (!text) {
          throw new Error("AI returned empty response");
        }

        // Robust JSON extraction
        let cleanedContent = text.trim();
        const jsonStart = cleanedContent.indexOf('{');
        const jsonEnd = cleanedContent.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
        }
        if (cleanedContent.includes('```')) {
          cleanedContent = cleanedContent.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        }

        const parsed = JSON.parse(cleanedContent);

        // Run validation
        const valRes = validateQuizData(parsed);
        if (valRes.valid) {
          quizData = parsed;
          console.log(`[generate-quiz-from-doc] Validation PASSED on attempt ${attempt}.`);
          break;
        } else {
          console.warn(`[generate-quiz-from-doc] Validation FAILED on attempt ${attempt}: ${valRes.reason}`);
          feedback = `Your previous response failed quality validation: ${valRes.reason}. 
Please regenerate the entire response, ensuring strict adherence to the language rules (100% pure script, absolutely NO characters from other scripts or layout errors like dotted circles inside the text).`;
          
          // Switch to fallback model for subsequent attempts if using openrouter
          if ((finalProvider === 'openrouter' || finalProvider === 'lovable') && attempt < maxAttempts) {
            const nextModel = RELIABLE_FREE_MODELS[attempt % RELIABLE_FREE_MODELS.length];
            if (nextModel !== currentModelToUse) {
              console.log(`[generate-quiz-from-doc] Switching to fallback model: ${nextModel}`);
              currentModelToUse = nextModel;
            }
          }
        }
      } catch (e: any) {
        console.error(`[generate-quiz-from-doc] Attempt ${attempt} failed with error: ${e.message}`);
        lastError = e;
        
        // Try fallback models on exception
        if ((finalProvider === 'openrouter' || finalProvider === 'lovable') && attempt < maxAttempts) {
          const nextModel = RELIABLE_FREE_MODELS[attempt % RELIABLE_FREE_MODELS.length];
          console.log(`[generate-quiz-from-doc] Exception fallback. Switching to: ${nextModel}`);
          currentModelToUse = nextModel;
        }
      }
    }

    console.log(`AI responded in ${Date.now() - startTime}ms`);

    if (!quizData) {
      const errorMsg = lastError?.message || "Failed to generate a valid and high-quality quiz after 3 attempts. Please try again.";
      throw new Error(errorMsg);
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
