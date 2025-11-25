import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
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

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.0");
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Authentication failed:", userError?.message || "No user returned");
      return new Response(
        JSON.stringify({ error: "Authentication failed. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { documentText, topic, questionCount, difficulty, language } = await req.json();

    if (!documentText || !questionCount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are QuizMaker — an assistant that outputs ONLY valid JSON. Generate quiz questions based on provided document content.",
          },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate quiz from document" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    let quizData;
    try {
      quizData = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Invalid quiz format received" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(quizData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating quiz from document:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
