import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OpenRouter configuration
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_FALLBACK_MODEL = 'google/gemini-2.0-flash-exp:free';
const RELIABLE_FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/pixtral-12b:free',
  'deepseek/deepseek-chat:free'
];

interface AISettings {
  provider: 'openrouter' | 'gemini' | 'openai';
  model: string;
  temperature: number;
  system_prompt?: string;
  openrouter_api_key?: string;
  gemini_api_key?: string;
  openai_api_key?: string;
}

// Timeout helper for fetch
async function fetchWithTimeout(resource: string | URL | Request, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 45000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAISettings(supabase: any): Promise<AISettings> {
  try {
    const { data } = await supabase
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

  const effectiveProvider = (provider as string) === 'lovable' ? 'openrouter' : provider;

  if (effectiveProvider === 'gemini' && aiSettings.gemini_api_key) {
    apiKey = aiSettings.gemini_api_key;
    finalProvider = 'gemini';
  } else if (effectiveProvider === 'openai' && aiSettings.openai_api_key) {
    apiKey = aiSettings.openai_api_key;
    finalProvider = 'openai';
  } else if (effectiveProvider === 'openrouter' && aiSettings.openrouter_api_key) {
    apiKey = aiSettings.openrouter_api_key;
    finalProvider = 'openrouter';
  }

  // FALLBACK
  if (!apiKey) {
    console.warn(`[generate-quiz] No API key for ${effectiveProvider}, trying fallbacks...`);
    if (aiSettings.openrouter_api_key) {
      apiKey = aiSettings.openrouter_api_key;
      finalProvider = 'openrouter';
      if (!model.includes('/')) model = 'google/gemini-2.0-flash-exp:free';
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Authenticate user securely (requires cryptographic signature verification)
    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error("Authentication failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Authentication failed. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authUserId = user.id;
    console.log("Authenticated user ID:", authUserId);

    const requestData: {
      topic?: string;
      questionCount?: number;
      difficulty?: string;
      systemPrompt?: string;
      language?: string;
      channelId?: string;
      useChannelKnowledgeBase?: boolean;
    } = await req.json();

    const {
      topic,
      questionCount,
      difficulty,
      systemPrompt,
      language = 'bn',
      channelId,
      useChannelKnowledgeBase = false,
    } = requestData;

    if (!topic || typeof topic !== 'string') {
      return new Response(
        JSON.stringify({ error: "Topic is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for db operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch AI settings from database
    const aiSettings = await getAISettings(supabase);

    // Resolve provider with fallback logic
    const { finalProvider, apiKey, model: resolvedModel } = resolveProvider(aiSettings);

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: `AI সার্ভিস কনফিগার করা হয়নি। Super Admin Settings → AI ট্যাবে গিয়ে আপনার OpenRouter / Gemini / OpenAI API Key সেট করুন।`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-quiz] Using provider=${finalProvider}, model=${resolvedModel}, hasKey=${!!apiKey}`);

    let knowledgeBaseContext = '';
    let channelSystemPrompt = '';

    if (channelId && useChannelKnowledgeBase) {
      const { data: channel } = await supabase
        .from("channels")
        .select("settings, user_id")
        .eq("id", channelId)
        .single();

      if (channel && channel.user_id === authUserId) {
        if (channel?.settings?.system_prompt) {
          channelSystemPrompt = channel.settings.system_prompt;
        }

        const { data: documents } = await supabase
          .from("documents")
          .select("title, extracted_text")
          .eq("channel_id", channelId)
          .eq("processing_status", "completed")
          .limit(10);

        if (documents && documents.length > 0) {
          knowledgeBaseContext = documents
            .map((doc: { title: string; extracted_text?: string }) => `Document: ${doc.title}\n${doc.extracted_text?.substring(0, 2000) || ''}`)
            .join('\n\n---\n\n')
            .substring(0, 8000);
        }
      }
    }

    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();

    const languageInstructions: Record<string, string> = {
      'bn': `CRITICAL BENGALI LANGUAGE REQUIREMENTS:
- Every word, question, option, explanation, and the topic must be written in 100% pure Bengali script (বাংলা Unicode).
- Do NOT mix English, Hindi (Devanagari), or any other script inside Bengali words or sentences.
- All technical terms must be transliterated into Bengali script (e.g., use 'ইউপিএসসি' instead of 'UPSC').
- Do NOT use any English/Latin characters (a-z, A-Z) or Hindi/Devanagari characters anywhere in the JSON response.
- Translate the topic title itself into Bengali.
- Ensure proper Unicode encoding.`,
      'en': 'Generate all content in English. Use clear, accessible language.',
      'hi': `CRITICAL HINDI LANGUAGE REQUIREMENTS:
- Every word, question, option, explanation, and the topic must be written in 100% pure Hindi script (हिन्दी Devanagari).
- Do NOT mix English, Bengali, or any other script inside Hindi words or sentences.
- All technical terms must be transliterated into Devanagari script.
- Do NOT use any English/Latin characters (a-z, A-Z) anywhere in the JSON response.
- Translate the topic title itself into Hindi.
- Ensure proper Unicode encoding.`,
    };

    const baseSystemPrompt = `You are QuizMaker — an Expert Competitive Examination Question Setter with 15+ years of experience designing high-quality MCQs for government and competitive examinations.
    ${languageInstructions[language] || languageInstructions['bn']}
    Generate a quiz with EXACTLY ${questionCount} questions for the topic: "${topic}".
    Difficulty: ${difficulty}.

    EXAM-ORIENTED QUESTION SETTING RULES:
    1. Base questions on important concepts frequently asked in competitive exams (UPSC, SSC, State PSCs).
    2. Follow the style and difficulty of previous year questions (PYQs), but do NOT copy them verbatim.
    3. Difficulty distribution should be: 40% PYQ Style, 30% Concept Based, 20% Application Based, 10% Analytical.
    4. Each question must test one important concept only, have exactly ONE correct answer, be factually correct, and have clear, unambiguous wording.
    5. Avoid grammatical clues, obvious answers, trick wording, "All of the Above", and "None of the Above".
    6. Distractor options must be believable, plausible, and belong to the same category (e.g., all dynasty names, all organic compounds). No random/silly options.
    7. Write explanations with:
       - Correct Answer
       - Short explanation of why it is correct
       - Brief explanation of why other options are incorrect
       - One-line "Exam Tip" (keep under the Telegram character limits)
    8. Focus on Indian context. Do NOT generate Bangladesh-related topics.

    CRITICAL TELEGRAM LIMITS (STRICT):
    - Question text: Keep under 120 characters (Max 300).
    - Each option text: Keep under 80 characters (Max 100).
    - Explanation text: Keep under 200 characters.
    
    If content is naturally longer, summarize or simplify it to stay under these hard limits.
    NO preamble, NO markdown, NO human text. Output ONLY JSON.`;

    const instructions = channelSystemPrompt || systemPrompt || '';
    const globalSystemPrompt = aiSettings.system_prompt || '';
    const finalSystemPrompt = (globalSystemPrompt ? globalSystemPrompt + "\n\n" : "") + baseSystemPrompt + (instructions ? `\n\nCUSTOM INSTRUCTIONS: ${instructions}` : "");

    const userPrompt = `Generate a JSON quiz. 
    ${knowledgeBaseContext ? `Use this context:\n${knowledgeBaseContext}` : ""}
    
    SCHEMA:
    {
      "request_id": "${requestId}",
      "topic": "${topic}",
      "questions": [
        {
          "id": 1,
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correct_option_index": 0,
          "explanation": "string"
        }
      ],
      "metadata": { "difficulty": "${difficulty}", "generated_at": "${now}" }
    }`;

    // content will be assigned from the text variable after AI generation
    const systemPromptFinal = (aiSettings.system_prompt || "") + (finalSystemPrompt || "");
    const startTime = Date.now();
    let text = "";
    let lastError = null;

    async function attemptGeneration(currentModel: string, currentProvider: string, currentApiKey: string, feedbackPrompt = "") {
      const combinedPrompt = `${systemPromptFinal}\n\nUSER PROMPT: ${userPrompt}${feedbackPrompt ? `\n\n⚠️ REGENERATION FEEDBACK: ${feedbackPrompt}` : ""}`;
      
      if (currentProvider === 'gemini') {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${currentApiKey}`;
        const geminiResponse = await fetchWithTimeout(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: combinedPrompt }] }],
            generationConfig: { temperature: aiSettings.temperature || 0.7, maxOutputTokens: 2000 }
          }),
          timeout: 45000,
        });

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          throw new Error(`Gemini API error (${geminiResponse.status}): ${errorText.substring(0, 200)}`);
        }
        const geminiData: any = await geminiResponse.json();
        const resText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!resText) throw new Error("Gemini returned empty response");
        return resText;
      }

      const fetchUrl = currentProvider === 'openai' ? "https://api.openai.com/v1/chat/completions" : OPENROUTER_API_URL;
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${currentApiKey}`,
        "Content-Type": "application/json",
      };
      if (currentProvider !== 'openai') {
        headers["HTTP-Referer"] = "https://telepost.io";
        headers["X-Title"] = "TelePost QuizMaker";
      }

      const res = await fetchWithTimeout(fetchUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: "system", content: systemPromptFinal + (feedbackPrompt ? `\n\n⚠️ REGENERATION FEEDBACK: ${feedbackPrompt}` : "") },
            { role: "user", content: userPrompt }
          ],
          temperature: aiSettings.temperature || 0.7,
        }),
        timeout: 45000,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${currentProvider} error: ${err.substring(0, 200)}`);
      }

      const data: any = await res.json();
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

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[generate-quiz] Generation attempt ${attempt}/${maxAttempts} using ${resolvedModel}...`);
        text = await attemptGeneration(resolvedModel, finalProvider, apiKey, feedback);
        
        if (!text) {
          throw new Error("AI returned empty response");
        }

        // JSON parsing
        let cleanedContent = text.trim();
        const jsonStart = cleanedContent.indexOf('{');
        const jsonEnd = cleanedContent.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
        }
        if (cleanedContent.includes('```')) {
          cleanedContent = cleanedContent.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        }

        quizData = JSON.parse(cleanedContent);

        // Validation
        const validationResult = validateQuizData(quizData);
        if (validationResult.valid) {
          console.log(`[generate-quiz] Validation PASSED on attempt ${attempt}.`);
          break;
        } else {
          console.warn(`[generate-quiz] Validation FAILED on attempt ${attempt}: ${validationResult.reason}`);
          feedback = `Your previous response failed quality validation: ${validationResult.reason}. 
Please regenerate the entire response, ensuring strict adherence to the language rules (100% pure script, absolutely NO characters from other scripts inside the text).`;
          quizData = null;
        }
      } catch (e: any) {
        console.error(`[generate-quiz] Attempt ${attempt} failed with error: ${e.message}`);
        lastError = e;
        feedback = `Your previous attempt failed with error: ${e.message}. Please try again and ensure output matches the schema and script requirements.`;
      }
    }

    console.log(`AI responded in ${Date.now() - startTime}ms`);

    if (!quizData) {
      const errorMsg = lastError?.message || "Failed to generate a valid and high-quality quiz after 3 attempts. Please check your AI API configurations or try again.";
      throw new Error(errorMsg);
    }

    // Save to database
    try {
      await supabase.from("quiz_generations").insert({
        user_id: authUserId,
        channel_id: channelId || null,
        request_id: requestId,
        topic: topic.substring(0, 200),
        difficulty: difficulty,
        question_count: quizData.questions.length,
        questions: quizData.questions.map((doc: Record<string, any>) => ({ ...doc })),
        metadata: { ...quizData.metadata, language, used_knowledge_base: !!knowledgeBaseContext },
        status: "completed",
      });
      await supabase.rpc("increment_quiz_count", { p_user_id: authUserId });
    } catch (dbError) {
      console.warn("DB save failed:", dbError);
    }

    return new Response(JSON.stringify(quizData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Quiz generation error:", error);
    
    let errorMessage = error instanceof Error ? error.message : "Internal error";
    if (errorMessage.includes("Aborted") || errorMessage.includes("timeout")) {
      errorMessage = "AI generation timed out after 45 seconds. Please try again or use a shorter quiz.";
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});