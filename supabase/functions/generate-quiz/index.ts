import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with anon key and user's auth header for proper JWT validation
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
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
    } = await req.json();

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

    // Fetch channel knowledge base if requested
    let knowledgeBaseContext = '';
    let channelSystemPrompt = '';

    if (channelId && useChannelKnowledgeBase) {
      try {
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!supabaseServiceKey) {
          throw new Error("Service role key not configured");
        }
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        if (channel.user_id !== user.id) {
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
          .eq("user_id", user.id)
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
    const finalSystemPrompt = baseSystemPrompt + customInstructions;

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

    const userPrompt = `Create a multiple-choice quiz for the topic "${topic}".
${knowledgeBaseSection}
REQUIREMENTS:
1. Number of questions: ${questionCount}.
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
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseServiceKey) {
        throw new Error("Service role key not configured");
      }
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Save quiz generation to database using the authenticated user's ID
      const { error: insertError } = await supabase
        .from("quiz_generations")
        .insert({
          user_id: user.id,
          channel_id: channelId || null,
          document_id: null,
          request_id: requestId,
          topic: topic,
          difficulty: difficulty,
          question_count: questionCount,
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
          p_user_id: user.id,
        });

        if (usageError) {
          console.error("Failed to track quiz usage:", usageError);
          // Fallback: manually check and update usage tracking
          const { data: existingUsage } = await supabase
            .from("usage_tracking")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (existingUsage) {
            // Update existing usage
            await supabase
              .from("usage_tracking")
              .update({
                quizzes_generated_this_month: existingUsage.quizzes_generated_this_month + 1,
                total_quizzes_generated: existingUsage.total_quizzes_generated + 1,
              })
              .eq("user_id", user.id);
          } else {
            // Create new usage tracking record
            await supabase
              .from("usage_tracking")
              .insert({
                user_id: user.id,
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