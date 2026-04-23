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

// Models known to be dead/removed from OpenRouter
const DEAD_OPENROUTER_MODELS = ['arcee-ai/'];

interface AISettings {
  provider: 'openrouter' | 'lovable' | 'gemini' | 'openai';
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
    system_prompt: '',
    openrouter_api_key: '',
    gemini_api_key: '',
    openai_api_key: '',
  };
}

/**
 * Resolve the best available provider + API key + model.
 * Priority: user-selected provider → fallback to any provider with a key.
 */
function resolveProvider(aiSettings: AISettings): { finalProvider: string; apiKey: string; model: string } {
  const provider = aiSettings.provider || 'openrouter';
  let apiKey = '';
  let finalProvider = provider;
  let model = aiSettings.model;

  // Map lovable → openrouter
  const effectiveProvider = provider === 'lovable' ? 'openrouter' : provider;

  // Try the user's selected provider first
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

  // FALLBACK: if no key found for the selected provider, try others
  if (!apiKey) {
    console.warn(`[generate-quiz] No API key for ${effectiveProvider}, trying fallbacks...`);
    if (aiSettings.openrouter_api_key) {
      apiKey = aiSettings.openrouter_api_key;
      finalProvider = 'openrouter';
      // Keep the model as-is if it looks like an OpenRouter model, otherwise use a free default
      if (!model.includes('/')) {
        model = 'google/gemini-2.0-flash-exp:free';
      }
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
      console.warn(`[generate-quiz] Model "${model}" is dead, using fallback: ${OPENROUTER_FALLBACK_MODEL}`);
      model = OPENROUTER_FALLBACK_MODEL;
    }
  }

  return { finalProvider, apiKey, model };
}

serve(async (req) => {
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

    // Authenticate user - try multiple methods
    let authUserId: string | null = null;

    // Method 1: Direct JWT parsing (most reliable)
    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      authUserId = payload.sub;
      console.log("User ID from JWT:", authUserId);
    } catch (e) {
      console.error("Could not parse JWT:", e);
    }

    // Method 2: Fallback to supabase auth.getUser
    if (!authUserId) {
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

      if (!userError && user) {
        authUserId = user.id;
      }
    }

    if (!authUserId) {
      console.error("All authentication methods failed");
      return new Response(
        JSON.stringify({ error: "Authentication failed. Please log in again." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestData = await req.json();

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
            .map(doc => `Document: ${doc.title}\n${doc.extracted_text?.substring(0, 2000) || ''}`)
            .join('\n\n---\n\n')
            .substring(0, 8000);
        }
      }
    }

    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();

    const languageInstructions: Record<string, string> = {
      'bn': 'Generate all content in Bengali (বাংলা). Use Bengali script and culturally relevant examples.',
      'en': 'Generate all content in English. Use clear, accessible language.',
      'hi': 'Generate all content in Hindi (हिन्दी). Use Hindi script and culturally relevant examples.',
    };

    const baseSystemPrompt = `You are QuizMaker — an assistant that outputs ONLY valid JSON matching the exact schema requested.
    ${languageInstructions[language] || languageInstructions['bn']}
    Generate a quiz with EXACTLY ${questionCount} questions for the topic: "${topic}".
    Difficulty: ${difficulty}.

    QUESTION QUALITY:
    - Create clear, unambiguous questions.
    - Ensure correct answers are verifiable.
    - Make wrong options plausible but clearly incorrect.
    
    EXPLANATION FORMAT (IMPORTANT):
    - Write explanations in 3-5 bullet points
    - Use "•" for bullet points
    - Each point should be concise and educational
    - Example format:
      • Main reason why the answer is correct
      • Additional context or fact
      • Related information for learning

    CONTENT GUIDELINES:
    - Focus on Indian context and culturally relevant examples.
    - Don't generate Bangladesh related topics. If the topic is related to India, then generate the content.

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

    let content = '';
    const systemPromptFinal = (aiSettings.system_prompt || "") + (finalSystemPrompt || "");
    const startTime = Date.now();

    if (finalProvider === 'gemini') {
      console.log(`Calling Gemini Direct API for topic "${topic}" with model ${resolvedModel}...`);
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`;
      const geminiResponse = await fetchWithTimeout(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPromptFinal}\n\nUSER PROMPT: ${userPrompt}` }]
          }],
          generationConfig: {
            temperature: aiSettings.temperature || 0.7,
            maxOutputTokens: 2000,
          }
        }),
        timeout: 45000,
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("Gemini Direct Error:", errorText);
        throw new Error(`Gemini API error (${geminiResponse.status}): ${errorText.substring(0, 200)}`);
      }
      const geminiData = await geminiResponse.json();
      content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (finalProvider === 'openai') {
      console.log(`Calling OpenAI Direct API for topic "${topic}" with model ${resolvedModel}...`);
      const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: resolvedModel,
          messages: [
            { role: "system", content: systemPromptFinal },
            { role: "user", content: userPrompt }
          ],
          temperature: aiSettings.temperature || 0.7,
        }),
        timeout: 45000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI Direct Error:", errorText);
        throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`);
      }
      const data = await response.json();
      content = data.choices?.[0]?.message?.content;
    } else {
      console.log(`Calling OpenRouter API for topic "${topic}" with model ${resolvedModel}...`);

      const makeOpenRouterRequest = async (useModel: string) => {
        const response = await fetchWithTimeout(OPENROUTER_API_URL, {
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
              { role: "system", content: systemPromptFinal },
              { role: "user", content: userPrompt }
            ],
            temperature: aiSettings.temperature || 0.7,
          }),
          timeout: 45000,
        });

        if (!response.ok) {
          const errorDetail = await response.text();
          let errorMessage = `AI Service failure (${response.status})`;
          try {
            const errorJson = JSON.parse(errorDetail);
            errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
          } catch {
            errorMessage = errorDetail.substring(0, 300) || errorMessage;
          }
          return { ok: false as const, errorMessage };
        }

        const aiResponse = await response.json();
        return { ok: true as const, content: aiResponse.choices?.[0]?.message?.content || '' };
      };

      let result = await makeOpenRouterRequest(resolvedModel);

      // Auto-retry with fallback if model is dead or no endpoints found
      if (!result.ok && (result.errorMessage?.includes("No endpoints found") || result.errorMessage?.includes("404") || result.errorMessage?.includes("403"))) {
        console.warn(`[generate-quiz] Model "${resolvedModel}" failed/dead. Trying reliable fallbacks...`);
        
        for (const fallbackModel of RELIABLE_FREE_MODELS) {
          if (fallbackModel === resolvedModel) continue;
          console.log(`[generate-quiz] Retrying with fallback: ${fallbackModel}`);
          result = await makeOpenRouterRequest(fallbackModel);
          if (result.ok) {
            console.log(`[generate-quiz] Fallback success: ${fallbackModel}`);
            break;
          }
        }
      }

      if (!result.ok) {
        return new Response(
          JSON.stringify({
            error: `${result.errorMessage} [Model: ${resolvedModel}, Provider: openrouter]`,
          }),
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

      // Attempt to extract the first { to the last }
      const jsonStart = cleanedContent.indexOf('{');
      const jsonEnd = cleanedContent.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
      }

      // Still handle potential backticks if they are inside the extracted range for some reason
      if (cleanedContent.includes('```')) {
        cleanedContent = cleanedContent.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      }

      quizData = JSON.parse(cleanedContent);
    } catch (e: any) {
      console.error("Parse error. Snippet:", content.substring(0, 200));
      console.error("Detailed parsing error:", e.message);
      throw new Error(`Invalid JSON from AI: ${e.message}`);
    }

    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error("Invalid quiz structure");
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
        questions: quizData.questions,
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