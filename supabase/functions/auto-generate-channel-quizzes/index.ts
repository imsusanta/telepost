import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChannelSettings {
  auto_generate_quizzes: boolean;
  default_subject: string;
  default_difficulty: 'easy' | 'medium' | 'hard';
  default_language: 'bn' | 'en' | 'hi';
  questions_per_quiz: number;
  generation_frequency: string;
  system_prompt: string;
}

interface Channel {
  id: string;
  user_id: string;
  name: string;
  telegram_channel_id: string;
  settings: ChannelSettings;
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get server-side Telegram bot token
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({
          error: "Bot token not configured. Please add TELEGRAM_BOT_TOKEN to secrets."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body for optional parameters
    let specificChannelId: string | null = null;
    let forceGenerate = false;

    try {
      const body = await req.json();
      specificChannelId = body.channelId || null;
      forceGenerate = body.forceGenerate || false;
    } catch {
      // No body provided, process all channels
    }

    // Fetch channels that need auto-generation
    let query = supabase
      .from("channels")
      .select("*")
      .eq("settings->>auto_generate_quizzes", "true")
      .not("telegram_channel_id", "is", null);

    if (specificChannelId) {
      query = query.eq("id", specificChannelId);
    }

    const { data: channels, error: channelsError } = await query;

    if (channelsError) {
      console.error("Error fetching channels:", channelsError);
      throw new Error("Failed to fetch channels for auto-generation");
    }

    if (!channels || channels.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No channels configured for auto-generation",
          processed: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{
      channelId: string;
      channelName: string;
      success: boolean;
      error?: string;
      quizId?: string;
    }> = [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Process each channel
    for (const channel of channels as Channel[]) {
      try {
        console.log(`Processing channel: ${channel.name} (${channel.id})`);

        // Check if we should generate based on frequency
        if (!forceGenerate) {
          const shouldGenerate = await checkGenerationFrequency(
            channel.id,
            channel.settings.generation_frequency
          );

          if (!shouldGenerate) {
            console.log(`Skipping channel ${channel.name} - not due for generation`);
            results.push({
              channelId: channel.id,
              channelName: channel.name,
              success: true,
              error: "Not due for generation based on frequency settings",
            });
            continue;
          }
        }

        // Fetch channel's knowledge base (documents) - ISOLATED to this channel only
        const { data: documents, error: docsError } = await supabase
          .from("documents")
          .select("title, extracted_text, ai_summary, topics")
          .eq("channel_id", channel.id)
          .eq("user_id", channel.user_id)
          .eq("processing_status", "completed")
          .not("extracted_text", "is", null)
          .limit(10);

        if (docsError) {
          console.error(`Error fetching documents for channel ${channel.id}:`, docsError);
          throw docsError;
        }

        // Build knowledge base context from channel documents
        let knowledgeBaseContext = '';
        if (documents && documents.length > 0) {
          knowledgeBaseContext = documents
            .map(doc => {
              let content = `Document: ${doc.title}\n`;
              if (doc.ai_summary) {
                content += `Summary: ${doc.ai_summary}\n`;
              }
              content += `Content: ${doc.extracted_text?.substring(0, 2000) || ''}`;
              return content;
            })
            .join('\n\n---\n\n');

          // Limit total knowledge base to 5000 characters
          knowledgeBaseContext = knowledgeBaseContext.substring(0, 5000);
        }

        // Determine topic for quiz generation
        const topic = determineTopic(channel, documents);

        // Generate system prompt for this channel
        const systemPrompt = generateChannelSystemPrompt(channel, knowledgeBaseContext);

        // Generate quiz
        const quiz = await generateQuizForChannel(
          LOVABLE_API_KEY,
          channel,
          topic,
          systemPrompt,
          knowledgeBaseContext
        );

        // Validate quiz response
        if (!quiz) {
          throw new Error("Quiz generation returned null or undefined");
        }

        if (quiz.error) {
          throw new Error(`Quiz generation failed: ${quiz.error}`);
        }

        if (!quiz.questions || !Array.isArray(quiz.questions)) {
          throw new Error("Quiz generation failed: No questions array in response");
        }

        if (quiz.questions.length === 0) {
          throw new Error("Quiz generation failed: Questions array is empty");
        }

        // Validate each question has required fields
        for (let i = 0; i < quiz.questions.length; i++) {
          const q = quiz.questions[i];
          if (!q.question || !q.options || !Array.isArray(q.options)) {
            throw new Error(`Invalid question at index ${i}: Missing question or options`);
          }
          if (q.options.length < 2) {
            throw new Error(`Invalid question at index ${i}: Must have at least 2 options`);
          }
          if (typeof q.correct_option_index !== 'number' || q.correct_option_index < 0 || q.correct_option_index >= q.options.length) {
            throw new Error(`Invalid question at index ${i}: Invalid correct_option_index`);
          }
        }

        // Ensure quiz has valid questions array
        if (!quiz.questions || quiz.questions.length === 0) {
          throw new Error("Quiz generation failed: No valid questions");
        }

        // Send to Telegram (using server-side bot token)
        await sendQuizToTelegram(
          TELEGRAM_BOT_TOKEN,
          channel.telegram_channel_id,
          { ...quiz, questions: quiz.questions }
        );

        // Record the generation
        const { data: generationRecord, error: recordError } = await supabase
          .from("quiz_generations")
          .insert({
            user_id: channel.user_id,
            channel_id: channel.id,
            topic: topic,
            question_count: quiz.questions.length,
            difficulty: channel.settings.default_difficulty,
            language: channel.settings.default_language,
            source_type: knowledgeBaseContext ? "document" : "ai",
            quiz_data: quiz,
            delivery_method: "telegram",
            telegram_chat_id: channel.telegram_channel_id,
          })
          .select()
          .single();

        if (recordError) {
          console.error(`Error recording generation for channel ${channel.id}:`, recordError);
        }

        results.push({
          channelId: channel.id,
          channelName: channel.name,
          success: true,
          quizId: generationRecord?.id,
        });

        console.log(`Successfully generated and sent quiz for channel: ${channel.name}`);
      } catch (error) {
        console.error(`Error processing channel ${channel.id} (${channel.name}):`, error);
        console.error('Error type:', typeof error);
        console.error('Error instanceof Error:', error instanceof Error);

        // Ensure we always have a string error message
        let errorMessage: string;
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = String((error as { message: unknown }).message);
        } else {
          errorMessage = `Unknown error: ${JSON.stringify(error)}`;
        }

        results.push({
          channelId: channel.id,
          channelName: channel.name,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter(r => r.success && !r.error?.includes("Not due")).length;
    const skippedCount = results.filter(r => r.error?.includes("Not due")).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${channels.length} channels: ${successCount} successful, ${skippedCount} skipped, ${failureCount} failed`,
        processed: successCount,
        skipped: skippedCount,
        failed: failureCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in auto-generate-channel-quizzes:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Check if a channel is due for quiz generation based on frequency settings
 */
async function checkGenerationFrequency(
  channelId: string,
  frequency: string
): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get last generation time for this channel
  const { data: lastGeneration } = await supabase
    .from("quiz_generations")
    .select("created_at")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!lastGeneration) {
    // Never generated, should generate now
    return true;
  }

  const lastGeneratedAt = new Date((lastGeneration as any).created_at);
  const now = new Date();
  const hoursSinceLastGeneration = (now.getTime() - lastGeneratedAt.getTime()) / (1000 * 60 * 60);

  // Check based on frequency
  switch (frequency) {
    case "daily":
      return hoursSinceLastGeneration >= 24;
    case "weekly":
      return hoursSinceLastGeneration >= 168; // 7 days
    case "bi-weekly":
      return hoursSinceLastGeneration >= 336; // 14 days
    case "monthly":
      return hoursSinceLastGeneration >= 720; // 30 days
    case "manual":
      return false; // Only generate when manually triggered
    default:
      return hoursSinceLastGeneration >= 24; // Default to daily
  }
}

/**
 * Determine the topic for quiz generation based on channel settings and documents
 */
function determineTopic(channel: Channel, documents: Array<{ topics?: string[]; title?: string }> | null): string {
  // Use default subject if set
  if (channel.settings.default_subject) {
    return channel.settings.default_subject;
  }

  // Try to extract topic from documents
  if (documents && documents.length > 0) {
    // Get topics from documents
    const allTopics: string[] = [];
    for (const doc of documents) {
      if (doc.topics && Array.isArray(doc.topics)) {
        allTopics.push(...doc.topics);
      }
      if (doc.title) {
        allTopics.push(doc.title);
      }
    }

    if (allTopics.length > 0) {
      // Return the most common topic or first topic
      return allTopics[0];
    }
  }

  // Fallback to channel name
  return channel.name;
}

/**
 * Generate a system prompt tailored to the channel
 */
function generateChannelSystemPrompt(channel: Channel, knowledgeBase: string): string {
  // If channel has a custom system prompt, use it
  if (channel.settings.system_prompt) {
    return channel.settings.system_prompt;
  }

  // Generate default system prompt based on channel settings
  const subject = channel.settings.default_subject || channel.name;
  const language = channel.settings.default_language;

  const languageInstructions: Record<string, string> = {
    'bn': 'Generate all content in Bengali (বাংলা). Use Bengali script and culturally relevant examples.',
    'en': 'Generate all content in English. Use clear, accessible language.',
    'hi': 'Generate all content in Hindi (हिन्दी). Use Hindi script and culturally relevant examples.',
  };

  let prompt = `You are a specialized quiz generator for "${subject}".

CHANNEL-SPECIFIC GUIDELINES:
- This is a dedicated channel for ${subject}
- Generate questions that are relevant and accurate for this specific topic
- Use the channel's knowledge base documents as the primary source for questions
- Ensure all questions are based ONLY on the content available in this channel
- Do NOT include information from external sources or other topics

${languageInstructions[language] || languageInstructions['en']}

QUESTION QUALITY:
- Create clear, unambiguous questions
- Ensure correct answers are verifiable from the knowledge base
- Make wrong options plausible but clearly incorrect
- Provide helpful explanations that reference the source material
- Maintain appropriate difficulty level: ${channel.settings.default_difficulty}`;

  // Add knowledge base context reminder if documents exist
  if (knowledgeBase) {
    prompt += `

IMPORTANT: Base ALL questions on the Knowledge Base Content provided. Do not generate questions about topics not covered in the documents.`;
  }

  return prompt;
}

/**
 * Generate quiz using AI
 */
async function generateQuizForChannel(
  apiKey: string,
  channel: Channel,
  topic: string,
  systemPrompt: string,
  knowledgeBase: string
): Promise<{ questions?: Array<{ id?: number; question: string; options: string[]; correct_option_index: number; explanation?: string }>; metadata?: Record<string, unknown>; topic?: string; error?: string }> {
  const requestId = crypto.randomUUID();
  const now = new Date().toISOString();

  const questionCount = channel.settings.questions_per_quiz || 10;
  const difficulty = channel.settings.default_difficulty || "medium";
  const language = channel.settings.default_language || "en";

  const baseSystemPrompt = `You are QuizMaker — an assistant that outputs ONLY valid JSON matching the exact schema requested.
You must NOT include explanations, markdown, comments, code fences, or any text outside the JSON.
If you cannot generate valid JSON, output exactly: {"error":"invalid_output"}.

${systemPrompt}`;

  // Language-specific instructions
  const languageInstructions: Record<string, string> = {
    'bn': 'ALL questions, options, and explanations MUST be written in Bengali (বাংলা).',
    'en': 'ALL questions, options, and explanations MUST be written in English.',
    'hi': 'ALL questions, options, and explanations MUST be written in Hindi (हिन्दी).',
  };

  const langInstruction = languageInstructions[language] || languageInstructions['en'];

  // Build knowledge base section
  const knowledgeBaseSection = knowledgeBase
    ? `\n\nCHANNEL KNOWLEDGE BASE:
IMPORTANT: Use ONLY the following documents to create quiz questions. All questions must be based on this content.

${knowledgeBase}

`
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
${knowledgeBase ? '10. CRITICAL: Base questions ONLY on the Channel Knowledge Base provided above. Do not include external information.' : ''}

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
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: baseSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("Payment required. Please add credits to your workspace.");
    }
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    throw new Error("Failed to generate quiz from AI");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in AI response");
  }

  // Parse the JSON response
  let quizData;
  try {
    quizData = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse AI response:", content);
    console.error("Parse error:", e);
    throw new Error(`Invalid JSON format received from AI: ${e instanceof Error ? e.message : 'Parse failed'}`);
  }

  // Ensure we return a valid object
  if (typeof quizData !== 'object' || quizData === null) {
    console.error("AI returned non-object:", quizData);
    throw new Error("AI response is not a valid object");
  }

  return quizData;
}

/**
 * Send quiz to Telegram channel
 */
async function sendQuizToTelegram(
  botToken: string,
  chatId: string,
  quiz: { topic?: string; questions: Array<{ id?: number; question: string; options: string[]; correct_option_index: number; explanation?: string }>; metadata?: { difficulty?: string } }
): Promise<void> {
  const baseUrl = `https://api.telegram.org/bot${botToken}`;

  // Send intro message
  const introMessage = `New Quiz: ${quiz.topic}\nQuestions: ${quiz.questions.length}\nDifficulty: ${quiz.metadata?.difficulty || 'medium'}`;

  await fetch(`${baseUrl}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: introMessage,
    }),
  });

  // Send each question as a poll
  for (let i = 0; i < quiz.questions.length; i++) {
    const question = quiz.questions[i];
    const pollData = {
      chat_id: chatId,
      question: question.question,
      options: question.options,
      type: "quiz",
      correct_option_id: question.correct_option_index,
      explanation: question.explanation || "",
      is_anonymous: true,
    };

    const pollResponse = await fetch(`${baseUrl}/sendPoll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pollData),
    });

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      console.error("Failed to send poll:", errorText);
      throw new Error(`Failed to send question ${i + 1} to Telegram: ${errorText}`);
    }

    // Small delay between questions
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
