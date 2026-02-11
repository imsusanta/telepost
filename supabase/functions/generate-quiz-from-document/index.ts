import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OpenRouter configuration
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

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
      const settings = data.setting_value as AISettings;
      // Force gpt-4o-mini if provider is lovable or using an old-style/unreliable model
      if (settings.provider === 'lovable' || settings.model.includes('gemini-2.0-flash-exp') || settings.model.includes('glm-4.5-air')) {
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
    openrouter_api_key: '',
    gemini_api_key: '',
    openai_api_key: '',
    system_prompt: '',
  };
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

    // Use service role key for server-side operations
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const { documentText, topic, questionCount, difficulty, language } = await req.json();

    if (!documentText || !questionCount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: documentText and questionCount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
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

    console.log(`Calling ${finalProvider === 'gemini' ? 'Gemini Direct' : (finalProvider === 'openai' ? 'OpenAI Direct' : 'OpenRouter')} for topic "${topic || 'Document'}" with model ${aiSettings.model}...`);
    const startTime = Date.now();
    let content = '';

    if (finalProvider === 'gemini') {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${aiSettings.model}:generateContent?key=${apiKey}`;
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
        throw new Error(`Gemini API error (${geminiResponse.status}): ${errorText.substring(0, 100)}`);
      }
      const geminiData = await geminiResponse.json();
      content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (finalProvider === 'openai') {
      console.log(`Calling OpenAI Direct API for topic "${topic || 'Document'}" with model ${aiSettings.model}...`);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiSettings.model,
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
        throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 100)}`);
      }
      const data = await response.json();
      content = data.choices?.[0]?.message?.content;
    } else {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": supabaseUrl,
          "X-Title": "QuizMaker",
        },
        body: JSON.stringify({
          model: aiSettings.model,
          messages: [
            { role: "system", content: baseSystemPromptFinal },
            { role: "user", content: userPrompt }
          ],
          temperature: aiSettings.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenRouter error: ${response.status}`, errorText);

        let errorMessage = `AI Service failure (${response.status})`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 200) || errorMessage;
        }

        return new Response(
          JSON.stringify({
            error: errorMessage,
            status: response.status
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await response.json();
      content = aiData.choices?.[0]?.message?.content;
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
