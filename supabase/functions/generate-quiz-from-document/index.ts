import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AISettings {
  provider: 'openrouter';
  model: string;
  temperature: number;
}

async function getAISettings(supabaseUrl: string, supabaseKey: string): Promise<AISettings> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_settings')
      .maybeSingle();

    if (error) {
      console.error("Error fetching AI settings:", error);
    }

    if (data?.setting_value) {
      return data.setting_value as AISettings;
    }
  } catch (error) {
    console.error("Failed to fetch AI settings:", error);
  }

  return {
    provider: 'openrouter',
    model: 'z-ai/glm-4.5-air:free',
    temperature: 0.7,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Quiz Generation from Document Request Started ===");

    // Get the authorization header to authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header in request");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the user's JWT token and get user information
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Authentication failed:", userError?.message || "No user returned");
      console.error("Auth error details:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication failed. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✓ User authenticated: ${user.id}`);

    const { documentText, topic, questionCount, difficulty, language } = await req.json();

    console.log(`Request params: topic="${topic}", questions=${questionCount}, difficulty=${difficulty}, language=${language}`);
    console.log(`Document text length: ${documentText?.length || 0} characters`);

    if (!documentText || !questionCount) {
      console.error("Missing required fields:", { hasDocumentText: !!documentText, questionCount });
      return new Response(
        JSON.stringify({ error: "Missing required fields: documentText and questionCount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (questionCount < 1 || questionCount > 20) {
      console.error(`Invalid question count: ${questionCount}`);
      return new Response(
        JSON.stringify({ error: "Question count must be between 1 and 20" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      console.error("CRITICAL: OPENROUTER_API_KEY environment variable is not set");
      throw new Error("AI configuration missing. Please add OpenRouter API key in admin settings.");
    }

    // Get AI settings from database
    const aiSettings = await getAISettings(supabaseUrl, supabaseKey);
    console.log(`✓ Using OpenRouter model: ${aiSettings.model}`);

    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Get language-specific instructions
    const languageInstructions = language === 'en'
      ? 'ALL questions, options, and explanations MUST be written in English.'
      : language === 'hi'
      ? 'ALL questions, options, and explanations MUST be written in Hindi (हिन्दी).'
      : 'ALL questions, options, and explanations MUST be written in Bengali (বাংলা).';

    const userPrompt = `Create a multiple-choice quiz based on the following document content.

DOCUMENT CONTENT:
${documentText.substring(0, 3000)}

REQUIREMENTS:
1. Number of questions: ${questionCount}
2. Topic: ${topic || 'General'}
3. Difficulty: ${difficulty || 'medium'}
4. Language: ${languageInstructions}
5. Each question must have 3–5 options
6. Use zero-based indexing for correct_option_index
7. Keep questions under 120 characters
8. Keep options under 80 characters
9. Provide a short explanation for each correct answer (max 200 chars)
10. Base questions on the document content provided above
11. Output MUST be ONLY valid JSON matching the schema below

OUTPUT JSON SCHEMA (MUST MATCH EXACTLY):

{
  "request_id": "${requestId}",
  "topic": "${topic || 'Document-based'}",
  "questions": [
    {
      "id": 0,
      "question": "string",
      "options": ["string","string","..."],
      "correct_option_index": 0,
      "explanation": "string"
    }
  ],
  "metadata": {
    "difficulty": "${difficulty || 'medium'}",
    "generated_at": "${now}",
    "source": "document"
  }
}

Return EXACTLY ${questionCount} questions. Do NOT include markdown, comments, or any text outside the JSON.`;

    console.log("Sending request to OpenRouter for quiz generation...");
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": supabaseUrl,
        "X-Title": "QuizMaker",
      },
      body: JSON.stringify({
        model: aiSettings.model,
        messages: [
          {
            role: "system",
            content: "You are QuizMaker — an assistant that outputs ONLY valid JSON. Generate quiz questions based on provided document content.",
          },
          { role: "user", content: userPrompt },
        ],
        temperature: aiSettings.temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI gateway error (${response.status}):`, errorText);

      // Check for specific error types
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "AI API authentication failed. Please check API key configuration." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI API rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "OpenRouter quota exceeded. Please check your billing." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Failed to generate quiz: OpenRouter error` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✓ AI response received (status: ${response.status})`);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      throw new Error("No content in AI response");
    }

    console.log(`AI response content length: ${content.length} characters`);

    let quizData;
    try {
      quizData = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response as JSON");
      console.error("Parse error:", e);
      console.error("Content preview:", content.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Invalid quiz format received from AI. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate quiz structure
    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      console.error("Invalid quiz structure: missing questions array");
      return new Response(
        JSON.stringify({ error: "Invalid quiz structure received" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✓ Quiz generated successfully: ${quizData.questions.length} questions`);
    console.log(`=== Quiz Generation Completed ===`);

    return new Response(JSON.stringify(quizData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("=== ERROR GENERATING QUIZ ===");
    console.error("Error details:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred while generating quiz",
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
