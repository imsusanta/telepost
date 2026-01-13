import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OpenRouter configuration
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface AISettings {
  provider: 'openrouter' | 'lovable';
  model: string;
  temperature: number;
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
    provider: 'lovable',
    model: 'openai/gpt-4o-mini',
    temperature: 0.7,
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Standard Supabase Auth check
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Auth failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Authentication failed. Please log in again." }),
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

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("AI service not configured (OPENROUTER_API_KEY missing)");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const aiSettings = await getAISettings(supabase);
    console.log(`Using model: ${aiSettings.model} via OpenRouter`);

    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();

    const languageInstructions = language === 'en'
      ? 'English'
      : language === 'hi'
        ? 'Hindi (हिन्दी)'
        : 'Bengali (বাংলা)';

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

    console.log(`Calling OpenRouter for topic "${topic || 'Document'}" with model ${aiSettings.model}...`);
    const startTime = Date.now();
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": supabaseUrl,
        "X-Title": "QuizMaker",
      },
      body: JSON.stringify({
        model: aiSettings.model,
        messages: [
          { role: "system", content: "You are a Quiz Maker. Output ONLY valid JSON containing the specified number of questions based on the content. No preamble, no markdown." },
          { role: "user", content: userPrompt }
        ],
        temperature: aiSettings.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter error: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({
          error: `AI Service failure (${response.status}): ${errorText.substring(0, 200)}`,
          status: response.status
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    console.log(`AI responded in ${Date.now() - startTime}ms`);

    if (!content) throw new Error("Empty AI response");

    // Robust JSON extraction
    let quizData;
    try {
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found");
      quizData = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
    } catch (e) {
      console.error("Parse error. Content snippet:", content.substring(0, 100));
      throw new Error("Failed to parse quiz data");
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
