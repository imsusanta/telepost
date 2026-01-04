import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lovable AI Gateway configuration
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("CRITICAL: LOVABLE_API_KEY environment variable is not set");
      throw new Error("AI configuration missing");
    }

    console.log(`✓ Using Lovable AI model: ${DEFAULT_MODEL}`);

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

    console.log("Sending request to Lovable AI for quiz generation...");
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: "You are QuizMaker — an assistant that outputs ONLY valid JSON. Generate quiz questions based on provided document content.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Lovable AI error (${response.status}):`, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage credits depleted. Please add funds to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate quiz. The AI service is temporarily unavailable." }),
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
