// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_FALLBACK_MODEL = 'google/gemini-2.0-flash-exp:free';
const RELIABLE_FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/pixtral-12b:free',
  'deepseek/deepseek-chat:free'
];
interface AISettings {
  provider: 'openrouter' | 'lovable' | 'gemini' | 'openai';
  model: string;
  temperature: number;
  system_prompt?: string;
  openrouter_api_key?: string;
  gemini_api_key?: string;
  openai_api_key?: string;
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
      return settings;
    }
  } catch (error) {
    console.error("Failed to fetch AI settings:", error);
  }

  return {
    provider: 'lovable',
    model: 'openai/gpt-4o-mini',
    temperature: 0.7,
    system_prompt: '',
    openrouter_api_key: '',
    gemini_api_key: '',
    openai_api_key: '',
  };
}

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
  telegram_bot_token: string | null;
  settings: ChannelSettings;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const provided = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    let allowed = !!(cronSecret && provided && provided === cronSecret);
    if (!allowed && authHeader?.startsWith("Bearer ")) {
      try {
        const tmp = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data } = await tmp.auth.getUser(authHeader.replace("Bearer ", ""));
        if (data?.user) allowed = true;
      } catch { /* ignore */ }
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get global Telegram bot token (used as fallback)
    const GLOBAL_TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

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

    const aiSettings = await getAISettings(supabase);

    let model = aiSettings.model;
    const provider = aiSettings.provider || 'openrouter';

    // Add fallback if model is empty to prevent API errors
    if (!model || model.trim() === '') {
        if (provider === 'gemini') model = 'gemini-2.0-flash';
        else if (provider === 'openai') model = 'gpt-4o-mini';
        else model = 'google/gemini-2.0-flash-exp:free';
    }

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
      if (model.toLowerCase().includes('gemini')) {
        finalProvider = 'gemini';
        apiKey = aiSettings.gemini_api_key!;
      } else {
        finalProvider = 'openrouter';
        apiKey = aiSettings.openrouter_api_key!;
      }
    }

    // Auto-detect: if model name has 'gemini' and we have a gemini key, prefer direct Gemini
    if (model.toLowerCase().includes('gemini') && !model.includes('/') && aiSettings.gemini_api_key) {
        apiKey = aiSettings.gemini_api_key;
        finalProvider = 'gemini';
    }

    if (!apiKey) {
      throw new Error(`AI service not configured (${finalProvider} API Key missing in Settings)`);
    }

    console.log(`Using ${finalProvider} with model: ${model}`);

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
          model,
          apiKey,
          finalProvider,
          channel,
          topic,
          systemPrompt,
          knowledgeBaseContext,
          aiSettings.system_prompt
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

        // Get bot token - prefer channel-specific, then user profile, then global
        let channelBotToken = channel.telegram_bot_token;

        // Fallback 1: Try to get from user's profile settings
        if (!channelBotToken) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('telegram_bot_token')
            .eq('id', channel.user_id)
            .single();

          if (profile?.telegram_bot_token) {
            channelBotToken = profile.telegram_bot_token;
            console.log(`Using profile bot token for channel: ${channel.name}`);
          }
        }

        // Fallback 2: Use global environment variable
        if (!channelBotToken) {
          channelBotToken = GLOBAL_TELEGRAM_BOT_TOKEN;
        }

        if (!channelBotToken) {
          throw new Error("No bot token configured. Please add a bot token to channel settings or in the Settings page.");
        }

        console.log(`Using ${channel.telegram_bot_token ? 'channel-specific' : 'profile/global'} bot token for channel: ${channel.name}`);
        console.log(`DEBUG: Channel ID: ${channel.id}, Chat ID from DB: "${channel.telegram_channel_id}", Bot Token length: ${channelBotToken?.length || 0}`);

        // Send to Telegram
        await sendQuizToTelegram(
          channelBotToken,
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
            questions: quiz.questions,
            metadata: {
              ...quiz.metadata,
              language: channel.settings.default_language,
              source_type: knowledgeBaseContext ? "document" : "ai",
              delivery_method: "telegram",
              telegram_chat_id: channel.telegram_channel_id,
            },
            status: "completed",
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
    console.log(`Using custom system prompt for channel ${channel.name}`);
    return channel.settings.system_prompt;
  }

  // Generate default system prompt based on channel settings
  const subject = channel.settings.default_subject || channel.name;
  const language = channel.settings.default_language;

  const languageInstructions: Record<string, string> = {
    'bn': `Generate ALL content in Bengali (বাংলা). Use Bengali script for EVERY word.
⚠️ তুমি শুধুমাত্র বাংলায় উত্তর দেবে। প্রতিটি প্রশ্ন, প্রতিটি অপশন, এবং প্রতিটি ব্যাখ্যা সম্পূর্ণ বাংলায় লিখতে হবে। ইংরেজি ভাষা একেবারেই ব্যবহার করবে না।`,
    'en': 'Generate all content in English. Use clear, accessible language.',
    'hi': `Generate ALL content in Hindi (हिन्दी). Use Hindi/Devanagari script for EVERY word.
⚠️ आपको केवल हिंदी में उत्तर देना है। हर प्रश्न, हर विकल्प, और हर व्याख्या पूरी तरह हिंदी में लिखनी है। अंग्रेज़ी का बिल्कुल भी उपयोग न करें।`,
  };

  let prompt = `You are a specialized quiz generator for "${subject}".

CHANNEL-SPECIFIC GUIDELINES:
- This is a dedicated channel for ${subject}
- Generate questions that are relevant and accurate for this specific topic
${knowledgeBase ? `- Use the channel's knowledge base documents as the primary source for questions
- Ensure all questions are based ONLY on the content available in this channel
- Do NOT include information from external sources or other topics` : `- Focus on ${subject} related questions using your general AI knowledge if no documents are provided`}

${languageInstructions[language] || languageInstructions['en']}

QUESTION QUALITY:
- Create clear, unambiguous questions
- Ensure correct answers are verifiable
- Make wrong options plausible but clearly incorrect
- Provide helpful explanations
- Maintain appropriate difficulty level: ${channel.settings.default_difficulty}

CONTENT GUIDELINES:
- Don't generate Bangladesh related topics. If the topic is related to India, then generate the content.`;

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
  model: string,
  apiKey: string,
  provider: string,
  channel: Channel,
  topic: string,
  systemPrompt: string,
  knowledgeBase: string,
  globalSystemPrompt?: string
): Promise<{ questions?: Array<{ id?: number; question: string; options: string[]; correct_option_index: number; explanation?: string }>; metadata?: Record<string, unknown>; topic?: string; error?: string }> {
  const requestId = crypto.randomUUID();
  const now = new Date().toISOString();

  const questionCount = channel.settings.questions_per_quiz || 10;
  const difficulty = channel.settings.default_difficulty || "medium";
  const language = channel.settings.default_language || "en";

  const baseSystemPrompt = `${globalSystemPrompt ? globalSystemPrompt + "\n\n" : ""}You are QuizMaker — an assistant that outputs ONLY valid JSON matching the exact schema requested.
You must NOT include explanations, markdown, comments, code fences, or any text outside the JSON.
If you cannot generate valid JSON, output exactly: {"error":"invalid_output"}.

${systemPrompt}`;

  // Language-specific instructions — VERY strong enforcement
  const languageInstructions: Record<string, string> = {
    'bn': `⚠️ MANDATORY: ALL content (questions, options, explanations) MUST be in Bengali (বাংলা). 
- প্রতিটি শব্দ বাংলা হরফে লিখতে হবে। 
- ইংরেজি শব্দ বা হরফ একেবারেই ব্যবহার করা যাবে না (No English words or script allowed). 
- Technical terms MUST be transliterated into Bengali script (e.g., write "ফোটোসিন্থেসিস" instead of "Photosynthesis").
- Avoid mixing English words even in explanations.`,
    'en': 'ALL questions, options, and explanations MUST be written in English.',
    'hi': `⚠️ MANDATORY: ALL questions, options, and explanations MUST be in Hindi (हिन्दी). 
- हर शब्द हिंदी/देवनागरी लिपि में होना चाहिए। 
- अंग्रेज़ी शब्दों का प्रयोग न करें। 
- तकनीकी शब्दों को हिंदी लिपि में लिखें।`,
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
4. Each question must have EXACTLY 4 options.
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

  let content = '';

  // Build a strong native-language system prefix for non-English
  const nativeLangPrefix: Record<string, string> = {
    'bn': 'তুমি একজন বাংলা কুইজ জেনারেটর। তুমি শুধুমাত্র বাংলায় উত্তর দেবে। প্রতিটি প্রশ্ন, প্রতিটি অপশন, এবং প্রতিটি ব্যাখ্যা সম্পূর্ণ বাংলায় লিখতে হবে। ইংরেজি ভাষা একেবারেই ব্যবহার করবে না।\n',
    'hi': 'आप एक हिंदी क्विज़ जेनरेटर हैं। आपको केवल हिंदी में उत्तर देना है। हर प्रश्न, हर विकल्प, और हर व्याख्या पूरी तरह हिंदी में लिखनी है। अंग्रेज़ी का बिल्कुल भी उपयोग न करें।\n',
  };
  const langPrefix = nativeLangPrefix[language] || '';

  const finalSystemPromptCombined = langPrefix + (globalSystemPrompt ? globalSystemPrompt + "\n\n" : "") + baseSystemPrompt;

  if (provider === 'gemini') {
    console.log(`Generating quiz for topic: ${topic} using model: ${model} via Direct Gemini`);
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${finalSystemPromptCombined}\n\nUSER PROMPT: ${userPrompt}` }]
        }],
        generationConfig: {
          temperature: 0.7,
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
  } else if (provider === 'openai') {
    console.log(`Generating quiz for topic: ${topic} using model: ${model} via Direct OpenAI`);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: finalSystemPromptCombined },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
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
    let openRouterModel = model;

    console.log(`Generating quiz for topic: ${topic} using model: ${openRouterModel} via OpenRouter`);

    const makeRequest = async (useModel: string) => {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://telepost.io",
          "X-Title": "QuizMaker Auto-Gen",
        },
        body: JSON.stringify({
          model: useModel,
          messages: [
            { role: "system", content: finalSystemPromptCombined },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return { ok: false as const, errorMessage: "Rate limit exceeded. Please try again later." };
        }
        if (response.status === 402) {
          return { ok: false as const, errorMessage: "Payment required. Please add credits to your workspace." };
        }
        const errorText = await response.text();
        let errorMsg = `OpenRouter error (${response.status})`;
        try {
          const errJson = JSON.parse(errorText);
          errorMsg = errJson.error?.message || errorMsg;
        } catch { errorMsg = errorText.substring(0, 200); }
        return { ok: false as const, errorMessage: errorMsg };
      }

      const aiData = await response.json();
      return { ok: true as const, content: aiData.choices?.[0]?.message?.content || '' };
    };

    let result = await makeRequest(openRouterModel);

    if (!result.ok) {
      throw new Error(result.errorMessage);
    }

    content = result.content;
  }

  if (!content) {
    throw new Error("No content in AI response");
  }

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
    console.error("Failed to parse AI response. Content length:", content.length);
    console.error("Content start:", content.substring(0, 100));
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
  // Normalize chat ID - add -100 prefix for channels/supergroups if needed
  let normalizedChatId = chatId;
  if (chatId && !chatId.startsWith('@') && !chatId.startsWith('-100')) {
    // If it's a numeric ID without -100 prefix, add it
    const numericId = chatId.replace(/^-/, '');
    if (/^\d+$/.test(numericId)) {
      normalizedChatId = `-100${numericId}`;
      console.log(`Normalized chat ID from ${chatId} to ${normalizedChatId}`);
    }
  }

  const baseUrl = `https://api.telegram.org/bot${botToken}`;

  // Helper to send Telegram requests with retry logic for 429 errors
  async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
    let retries = 0;
    while (retries < maxRetries) {
      const response = await fetch(url, options);
      if (response.status === 429) {
        const data = await response.json();
        const retryAfter = (data.parameters?.retry_after || 5) * 1000;
        console.warn(`Rate limited by Telegram. Retrying after ${retryAfter}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        retries++;
        continue;
      }
      return response;
    }
    return fetch(url, options); // Final attempt
  }

  // Send intro message
  const introMessage = `New Quiz: ${quiz.topic}\nQuestions: ${quiz.questions.length}\nDifficulty: ${quiz.metadata?.difficulty || 'medium'}`;

  await fetchWithRetry(`${baseUrl}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: normalizedChatId,
      text: introMessage,
    }),
  });

  // Send each question as a poll
  // Helper to truncate text to Telegram limits with surrogate-pair safety
  const safeTruncate = (str: string, limit: number): string => {
    if (!str) return "";
    // Use Array.from to correctly handle emojis and multi-unit characters
    const chars = Array.from(str);
    if (chars.length <= limit) return str;
    return chars.slice(0, limit - 3).join("") + "...";
  };

  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];

    // Telegram Poll Limits:
    // Question: 300 chars (we use 290 for safety)
    // Options: 100 chars each (we use 95 for safety)
    // Explanation: 200 chars (we use 190 for safety)
    const pollQuestion = safeTruncate(`Q${i + 1}. ${q.question}`, 290);
    const pollOptions = (q.options || []).map(opt => safeTruncate(opt, 95));
    const pollExplanation = safeTruncate(q.explanation || "Correct answer explanation", 190);

    const pollData = {
      chat_id: normalizedChatId,
      question: pollQuestion,
      options: pollOptions,
      type: "quiz",
      correct_option_id: q.correct_option_index,
      explanation: pollExplanation,
      is_anonymous: true,
    };

    const pollResponse = await fetchWithRetry(`${baseUrl}/sendPoll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pollData),
    });

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      console.error("Failed to send poll:", errorText);
      throw new Error(`Failed to send question ${i + 1} to Telegram: ${errorText}`);
    }

    // Standard 1000ms delay between polls to avoid rate limiting
    if (i < quiz.questions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
