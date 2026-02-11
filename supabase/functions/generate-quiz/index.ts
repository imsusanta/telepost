import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OpenRouter configuration
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface AISettings {
  provider: 'openrouter' | 'lovable' | 'gemini' | 'openai';
  model: string;
  temperature: number;
  system_prompt?: string;
  openrouter_api_key?: string;
  gemini_api_key?: string;
  openai_api_key?: string;
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
      const settings = data.setting_value as AISettings;

      // Allow Gemini models explicitly
      if (settings.model.includes('gemini')) {
        return settings;
      }

      // Force gpt-4o-mini if provider is lovable or using an old-style/unreliable model
      if (settings.provider === 'lovable' || settings.model.includes('glm-4.5-air')) {
        return {
          ...settings,
          provider: 'lovable',
          model: 'openai/gpt-4o-mini'
        };
      }
      return settings;
    }
  } catch (error) {
    console.error("Failed to fetch AI settings:", error);
  }

  return {
    provider: 'lovable',
    model: 'openai/gpt-4o-mini',
    temperature: 0.7,
    system_prompt: '',
    openrouter_api_key: '',
    gemini_api_key: '',
    openai_api_key: '',
  };
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

    const testModel = aiSettings.model;
    const provider = aiSettings.provider || 'openrouter';

    // Choose key based on provider
    let apiKey = '';
    let finalProvider = provider;

    if (provider === 'gemini') {
      apiKey = aiSettings.gemini_api_key!;
    } else if (provider === 'openai') {
      apiKey = aiSettings.openai_api_key!;
    } else if (provider === 'openrouter') {
      apiKey = aiSettings.openrouter_api_key!;
    } else if (provider === 'lovable') {
      apiKey = aiSettings.openrouter_api_key!;
      finalProvider = 'openrouter';
    } else {
      // Auto-detect if provider is unknown or missing
      if (testModel.toLowerCase().includes('gemini')) {
        finalProvider = 'gemini';
        apiKey = aiSettings.gemini_api_key!;
      } else {
        finalProvider = 'openrouter';
        apiKey = aiSettings.openrouter_api_key!;
      }
    }

    if (!apiKey) {
      throw new Error(`AI service not configured (${finalProvider} API Key missing in Settings)`);
    }

    console.log(`Using ${finalProvider} with model: ${aiSettings.model}`);

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
      console.log(`Calling Gemini Direct API for topic "${topic}" with model ${aiSettings.model}...`);
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${aiSettings.model}:generateContent?key=${apiKey}`;
      const geminiResponse = await fetch(geminiUrl, {
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
        })
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("Gemini Direct Error:", errorText);
        throw new Error(`Gemini API error (${geminiResponse.status}): ${errorText.substring(0, 100)}`);
      }
      const geminiData = await geminiResponse.json();
      content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (finalProvider === 'openai') {
      console.log(`Calling OpenAI Direct API for topic "${topic}" with model ${aiSettings.model}...`);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiSettings.model,
          messages: [
            { role: "system", content: systemPromptFinal },
            { role: "user", content: userPrompt }
          ],
          temperature: aiSettings.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI Direct Error:", errorText);
        throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 100)}`);
      }
      const data = await response.json();
      content = data.choices?.[0]?.message?.content;
    } else {
      console.log(`Calling OpenRouter API for topic "${topic}" with model ${aiSettings.model}...`);
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://telepost.io",
          "X-Title": "QuizMaker",
        },
        body: JSON.stringify({
          model: aiSettings.model,
          messages: [
            { role: "system", content: systemPromptFinal },
            { role: "user", content: userPrompt }
          ],
          temperature: aiSettings.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        console.error(`OpenRouter API error (${response.status}):`, errorDetail);

        let errorMessage = `AI Service failure (${response.status})`;
        try {
          const errorJson = JSON.parse(errorDetail);
          errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorDetail.substring(0, 200) || errorMessage;
        }

        return new Response(
          JSON.stringify({
            error: errorMessage,
            status: response.status
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResponse = await response.json();
      content = aiResponse.choices?.[0]?.message?.content;
    }

    console.log(`AI responded in ${Date.now() - startTime}ms`);

    if (!content) throw new Error("Empty AI response");

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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});