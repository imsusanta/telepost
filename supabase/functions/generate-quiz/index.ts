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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAISettings(supabase: any): Promise<AISettings> {
  try {
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
    // Get the authorization header to authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract user ID from JWT in Authorization header
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!supabaseUrl) {
      console.error("Missing Supabase URL configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let authUserId: string | null = null;
    try {
      const token = authHeader.replace("Bearer ", "").trim();
      const payloadBase64 = token.split(".")[1];
      const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
      const payloadJson = atob(normalized);
      const payload = JSON.parse(payloadJson);
      authUserId = (payload.sub || payload.user_id) as string | null;
    } catch (e) {
      console.error("Failed to parse JWT:", e);
      return new Response(
        JSON.stringify({ error: "Authentication failed. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authUserId) {
      console.error("Authentication failed: user ID missing in token");
      return new Response(
        JSON.stringify({ error: "Authentication failed. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User authenticated via JWT; authUserId will be used for authorization checks and auditing.

    // authUserId is already validated from the JWT; no additional auth checks needed here.

    const requestData = await req.json();
    
    // Input validation
    const {
      topic,
      questionCount,
      difficulty,
      systemPrompt,
      language = 'bn',
      batchCount = 1,
      channelId,
      useChannelKnowledgeBase = false,
      userId
    } = requestData;

    // Validate required fields
    if (!topic || typeof topic !== 'string') {
      return new Response(
        JSON.stringify({ error: "Topic is required and must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate topic length to prevent abuse
    const trimmedTopic = topic.trim();
    if (trimmedTopic.length < 1 || trimmedTopic.length > 200) {
      return new Response(
        JSON.stringify({ error: "Topic must be between 1 and 200 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate questionCount
    const parsedQuestionCount = Number(questionCount);
    if (!Number.isInteger(parsedQuestionCount) || parsedQuestionCount < 1 || parsedQuestionCount > 50) {
      return new Response(
        JSON.stringify({ error: "Question count must be an integer between 1 and 50" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate difficulty
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!difficulty || !validDifficulties.includes(difficulty)) {
      return new Response(
        JSON.stringify({ error: "Difficulty must be 'easy', 'medium', or 'hard'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate language
    const validLanguages = ['bn', 'en', 'hi'];
    if (language && !validLanguages.includes(language)) {
      return new Response(
        JSON.stringify({ error: "Language must be 'bn', 'en', or 'hi'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate systemPrompt length if provided
    if (systemPrompt && (typeof systemPrompt !== 'string' || systemPrompt.length > 2000)) {
      return new Response(
        JSON.stringify({ error: "System prompt must be a string under 2000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate channelId format if provided
    if (channelId && typeof channelId !== 'string') {
      return new Response(
        JSON.stringify({ error: "Channel ID must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use validated values
    const validatedTopic = trimmedTopic;
    const validatedQuestionCount = parsedQuestionCount;

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured. Please add it in admin settings.");
    }

    // Get AI settings from database
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseServiceKey) {
      throw new Error("Service role key not configured");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const aiSettings = await getAISettings(supabase);

    // Fetch channel knowledge base if requested
    let knowledgeBaseContext = '';
    let channelSystemPrompt = '';

    if (channelId && useChannelKnowledgeBase) {
      try {
        // Verify channel ownership
        const { data: channel, error: channelError } = await supabase
          .from("channels")
          .select("settings, user_id")
          .eq("id", channelId)
          .single();

        if (channelError || !channel) {
          console.error("Channel not found:", channelError);
          throw new Error("Channel not found");
        }

        // Security check: Verify the channel belongs to the authenticated user
        if (channel.user_id !== authUserId) {
          console.error("Channel does not belong to user");
          throw new Error("Unauthorized access to channel");
        }

        if (channel?.settings?.system_prompt) {
          channelSystemPrompt = channel.settings.system_prompt;
        }

        // Get channel documents (now safe because we verified channel ownership)
        const { data: documents, error: docsError } = await supabase
          .from("documents")
          .select("title, extracted_text, ai_summary")
          .eq("channel_id", channelId)
          .eq("user_id", authUserId)
          .eq("processing_status", "completed")
          .not("extracted_text", "is", null)
          .limit(10);

        if (docsError) {
          console.error("Error fetching documents:", docsError);
          throw docsError;
        }

        if (documents && documents.length > 0) {
          knowledgeBaseContext = documents
            .map(doc => `Document: ${doc.title}\n${doc.extracted_text?.substring(0, 2000) || ''}`)
            .join('\n\n---\n\n');

          // Limit total knowledge base to 5000 characters
          knowledgeBaseContext = knowledgeBaseContext.substring(0, 5000);
        } else {
          console.log("No completed documents found for channel");
        }
      } catch (error) {
        console.error("Error fetching channel knowledge base:", error);
        // Return error to user so they know what went wrong
        return new Response(
          JSON.stringify({
            error: "Failed to load channel knowledge base",
            details: error instanceof Error ? error.message : "Unknown error"
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();

    const baseSystemPrompt = `You are QuizMaker — an assistant that outputs ONLY valid JSON matching the exact schema requested.
You must NOT include explanations, markdown, comments, code fences, or any text outside the JSON.
If you cannot generate valid JSON, output exactly: {"error":"invalid_output"}.`;

    // Priority: channelSystemPrompt > systemPrompt parameter
    const effectiveSystemPrompt = channelSystemPrompt || systemPrompt || '';
    const customInstructions = effectiveSystemPrompt ? `\n\nADDITIONAL CUSTOM INSTRUCTIONS:\n${effectiveSystemPrompt}` : "";

    // Global content guidelines
    const contentGuidelines = `\n\nCONTENT GUIDELINES:\n- Don't generate Bangladesh related topics. If the topic is related to India, then generate the content.`;

    const finalSystemPrompt = baseSystemPrompt + customInstructions + contentGuidelines;

    // Language-specific instructions
    const languageInstructions = {
      'bn': 'ALL questions, options, and explanations MUST be written in Bengali (বাংলা).',
      'en': 'ALL questions, options, and explanations MUST be written in English.',
      'hi': 'ALL questions, options, and explanations MUST be written in Hindi (हिन्दी).',
    };

    const langInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions['bn'];

    // Add knowledge base context if available
    const knowledgeBaseSection = knowledgeBaseContext
      ? `\n\nKNOWLEDGE BASE CONTEXT:\nUse the following documents to create quiz questions. Base your questions on the content in these documents:\n\n${knowledgeBaseContext}\n\n`
      : '';

    const userPrompt = `Create a multiple-choice quiz for the topic "${validatedTopic}".
${knowledgeBaseSection}
REQUIREMENTS:
1. Number of questions: ${validatedQuestionCount}.
2. Difficulty: ${difficulty} (allowed: easy, medium, hard).
3. ${langInstruction}
4. Each question must have 3–5 options.
5. Use zero-based indexing for the correct option: "correct_option_index".
6. Keep each question under 120 characters.
7. Keep each option under 80 characters.
8. Provide a very short "explanation" for the correct answer (max 200 chars).
9. Output MUST be ONLY the JSON object below. No other text.
${knowledgeBaseContext ? '10. IMPORTANT: Base questions on the Knowledge Base Context provided above.' : ''}

OUTPUT JSON SCHEMA (MUST MATCH EXACTLY):

{
  "request_id": "${requestId}",
  "topic": "${validatedTopic}",
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
- Return EXACTLY ${validatedQuestionCount} questions.
- Ensure correct_option_index is inside the options array bounds.
- Do NOT add extra fields.
- Do NOT include markdown, comments, or human-readable text.
- If anything fails, return ONLY: {"error":"invalid_output"}.`;

    console.log(`Generating quiz with OpenRouter model: ${aiSettings.model}`);

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
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: aiSettings.temperature,
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
          JSON.stringify({ error: "OpenRouter quota exceeded. Please check your billing." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
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
    // Strip markdown code fences if present (e.g., ```json ... ```)
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith("```")) {
      // Remove opening fence (```json or ```)
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n?/, "");
      // Remove closing fence
      cleanedContent = cleanedContent.replace(/\n?```\s*$/, "");
    }

    let quizData;
    try {
      quizData = JSON.parse(cleanedContent);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Invalid quiz format received" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate that the AI returned a valid quiz structure, not an error
    if (quizData.error) {
      console.error("AI returned an error:", quizData.error);
      return new Response(
        JSON.stringify({ error: "Failed to generate quiz: AI returned an error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required quiz fields
    if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      console.error("AI response missing valid questions array:", JSON.stringify(quizData));
      return new Response(
        JSON.stringify({ error: "Invalid quiz format: missing or empty questions array" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!quizData.topic || !quizData.metadata) {
      console.error("AI response missing required fields:", JSON.stringify(quizData));
      return new Response(
        JSON.stringify({ error: "Invalid quiz format: missing required fields" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each question has required fields
    for (let i = 0; i < quizData.questions.length; i++) {
      const q = quizData.questions[i];
      if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correct_option_index !== 'number') {
        console.error(`Question ${i} is invalid:`, JSON.stringify(q));
        return new Response(
          JSON.stringify({ error: `Invalid quiz format: question ${i} is malformed` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate correct_option_index is within bounds
      if (q.correct_option_index < 0 || q.correct_option_index >= q.options.length) {
        console.error(`Question ${i} has out-of-bounds correct_option_index:`, JSON.stringify(q));
        return new Response(
          JSON.stringify({ error: `Invalid quiz format: question ${i} has invalid correct_option_index` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Save quiz to database (always save for authenticated users)
    try {
      // Save quiz generation to database using the authenticated user's ID
      const { error: insertError } = await supabase
        .from("quiz_generations")
        .insert({
          user_id: authUserId,
          channel_id: channelId || null,
          document_id: null,
          request_id: requestId,
          topic: validatedTopic,
          difficulty: difficulty,
          question_count: validatedQuestionCount,
          questions: quizData.questions,
          metadata: {
            ...quizData.metadata,
            language: language,
            used_knowledge_base: useChannelKnowledgeBase && !!knowledgeBaseContext,
            has_custom_prompt: !!systemPrompt || !!channelSystemPrompt,
          },
          status: "completed",
        });

      if (insertError) {
        console.error("Failed to save quiz to database:", insertError);
        // Don't fail the request, just log the error
      } else {
        // Track quiz generation in usage statistics
        const { error: usageError } = await supabase.rpc("increment_quiz_count", {
          p_user_id: authUserId,
        });

        if (usageError) {
          console.error("Failed to track quiz usage:", usageError);
          // Fallback: manually check and update usage tracking
          const { data: existingUsage } = await supabase
            .from("usage_tracking")
            .select("*")
            .eq("user_id", authUserId)
            .maybeSingle();

          if (existingUsage) {
            // Update existing usage
            await supabase
              .from("usage_tracking")
              .update({
                quizzes_generated_this_month: existingUsage.quizzes_generated_this_month + 1,
                total_quizzes_generated: existingUsage.total_quizzes_generated + 1,
              })
              .eq("user_id", authUserId);
          } else {
            // Create new usage tracking record
            await supabase
              .from("usage_tracking")
              .insert({
                user_id: authUserId,
                quizzes_generated_this_month: 1,
                total_quizzes_generated: 1,
                pdfs_uploaded_this_month: 0,
                total_pdfs_uploaded: 0,
                total_storage_used_bytes: 0,
              });
          }
        }
      }
    } catch (dbError) {
      console.error("Database operation failed:", dbError);
      // Don't fail the request, quiz generation was successful
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