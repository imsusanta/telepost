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
    const { topic, questionCount, difficulty, systemPrompt } = await req.json();
    
    if (!topic || !questionCount || !difficulty) {
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

    const baseSystemPrompt = `You are QuizMaker — an assistant that outputs ONLY valid JSON matching the exact schema requested. 
You must NOT include explanations, markdown, comments, code fences, or any text outside the JSON. 
If you cannot generate valid JSON, output exactly: {"error":"invalid_output"}.`;

    const customInstructions = systemPrompt ? `\n\nADDITIONAL CUSTOM INSTRUCTIONS:\n${systemPrompt}` : "";
    const finalSystemPrompt = baseSystemPrompt + customInstructions;

    const userPrompt = `Create a multiple-choice quiz for the topic "${topic}" IN BENGALI LANGUAGE.

REQUIREMENTS:
1. Number of questions: ${questionCount}.
2. Difficulty: ${difficulty} (allowed: easy, medium, hard).
3. ALL questions, options, and explanations MUST be written in Bengali (বাংলা).
4. Each question must have 3–5 options.
5. Use zero-based indexing for the correct option: "correct_option_index".
6. Keep each question under 120 characters.
7. Keep each option under 80 characters.
8. Provide a very short "explanation" for the correct answer in Bengali (max 200 chars).
9. Output MUST be ONLY the JSON object below. No other text.

OUTPUT JSON SCHEMA (MUST MATCH EXACTLY):

{
  "request_id": "${requestId}",
  "topic": "${topic}",
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
    "difficulty": "${difficulty}",
    "generated_at": "${now}"
  }
}

ADDITIONAL RULES:
- Return EXACTLY ${questionCount} questions.
- Ensure correct_option_index is inside the options array bounds.
- Do NOT add extra fields.
- Do NOT include markdown, comments, or human-readable text.
- If anything fails, return ONLY: {"error":"invalid_output"}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate quiz" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response from AI
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
    console.error("Error generating quiz:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});