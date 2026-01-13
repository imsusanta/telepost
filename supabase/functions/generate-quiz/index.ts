import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Groq API configuration
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface AISettings {
  provider: 'groq' | 'openrouter' | 'lovable';
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
      const settings = data.setting_value as AISettings;
      // Force Groq provider with llama model
      return {
        ...settings,
        provider: 'groq',
        model: 'llama-3.3-70b-versatile'
      };
    }
  } catch (error) {
    console.error("Failed to fetch AI settings:", error);
  }

  return {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authUserId = user.id;
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

    // Get Groq API Key from environment
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("AI service not configured (GROQ_API_KEY missing)");
    }

    // Create Supabase client with service role for db operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch AI settings from database
    const aiSettings = await getAISettings(supabase);
    console.log(`Using model: ${aiSettings.model} via Groq`);

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
    - Provide helpful explanations.

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
    const finalSystemPrompt = baseSystemPrompt + (instructions ? `\n\nCUSTOM INSTRUCTIONS: ${instructions}` : "");

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

    console.log(`Calling Groq API for topic "${topic}" with model ${aiSettings.model}...`);
    const startTime = Date.now();
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiSettings.model,
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: aiSettings.temperature || 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorDetail = await response.text();
      console.error(`Groq API error (${response.status}):`, errorDetail);

      return new Response(
        JSON.stringify({
          error: `AI Service failure (${response.status}): ${errorDetail.substring(0, 200)}`,
          status: response.status
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    console.log(`AI responded in ${Date.now() - startTime}ms`);

    if (!content) throw new Error("Empty AI response");

    // Robust JSON extraction
    let quizData;
    try {
      // Remove any markdown code blocks if present
      const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

      const jsonStart = cleanedContent.indexOf('{');
      const jsonEnd = cleanedContent.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in AI response");

      const jsonString = cleanedContent.substring(jsonStart, jsonEnd + 1);
      quizData = JSON.parse(jsonString);
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