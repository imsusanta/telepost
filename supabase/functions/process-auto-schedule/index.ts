import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

interface AISettings {
    provider: 'openrouter' | 'lovable' | 'gemini' | 'openai';
    model: string;
    temperature: number;
    system_prompt?: string;
    openrouter_api_key?: string;
    gemini_api_key?: string;
    openai_api_key?: string;
}

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
        provider: 'openrouter',
        model: 'google/gemini-2.0-flash-exp:free',
        temperature: 0.7,
        system_prompt: '',
    } as AISettings;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        // --- SELF-REPAIR CONFIGURATION BLOCK ---
        const repairSecret = req.headers.get("X-Telepost-Repair-Secret");
        const isRepairRequest = repairSecret === "fix-my-config-2026";

        try {
            const { data: configData } = await supabaseAdmin
                .from('system_config')
                .select('key, value')
                .in('key', ['supabase_url', 'supabase_service_role_key']);

            const currentUrl = configData?.find(c => c.key === 'supabase_url')?.value;
            const currentKey = configData?.find(c => c.key === 'supabase_service_role_key')?.value;

            // Repair if missing OR if explicitly requested via secret OR if key looks like a placeholder
            const needsRepair = !configData || configData.length < 2 ||
                isRepairRequest ||
                (currentKey && !currentKey.includes('.')); // Simple check for "not a JWT"

            if (needsRepair) {
                console.log(`Self-repairing system_config entries... (Request: ${isRepairRequest})`);
                await supabaseAdmin.rpc('set_system_config', {
                    config_key: 'supabase_url',
                    config_value: supabaseUrl,
                    config_description: 'Supabase project URL for calling edge functions'
                });
                await supabaseAdmin.rpc('set_system_config', {
                    config_key: 'supabase_service_role_key',
                    config_value: supabaseKey,
                    config_description: 'Supabase service role key for authenticating edge function calls'
                });
                console.log("system_config restoration complete.");

                if (isRepairRequest) {
                    return new Response(JSON.stringify({ message: "Configuration repaired successfully" }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }
            }
        } catch (repairError) {
            console.error("Self-repair of system_config failed:", repairError);
        }
        // ----------------------------------------

        // Parse request body for manual triggers
        let force = false;
        let targetUserId = null;
        let previewOnly = false;
        try {
            const body = await req.json();
            force = body.force === true;
            targetUserId = body.userId;
            previewOnly = body.previewOnly === true;
        } catch (e) {
            // Ignore parse errors for cron triggers (GET or empty POST)
        }

        // Get current time
        const now = new Date();

        console.log(`Processing auto-schedules. UTC: ${now.toISOString()}, Force: ${force}, TargetUser: ${targetUserId}`);

        // Fetch enabled auto-schedule settings
        let query = supabaseAdmin
            .from("auto_schedule_settings")
            .select(`
                *,
                channels (
                    name,
                    telegram_channel_id,
                    settings
                )
            `)
            .eq("enabled", true);

        if (targetUserId) {
            query = query.eq("user_id", targetUserId);
        }

        const { data: settings, error: settingsError } = await query;

        if (settingsError) {
            console.error("Error fetching auto-schedule settings:", settingsError);
            throw settingsError;
        }

        if (!settings || settings.length === 0) {
            return new Response(JSON.stringify({ message: "No enabled auto-schedules found" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Helper: get local HH:MM in a timezone
        const getLocalHHMM = (date: Date, tz: string): string => {
            const formatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: tz,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            const parts = formatter.formatToParts(date);
            const hh = parts.find(p => p.type === 'hour')?.value || '00';
            const mm = parts.find(p => p.type === 'minute')?.value || '00';
            return `${hh}:${mm}`;
        };

        const computeScheduledDate = (schedTimeStr: string, tz: string, now: Date): Date => {
            const [h, m] = schedTimeStr.split(':').map(Number);
            const targetTotalMinutes = h * 60 + m;
            const todayInTZ = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
            const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
            const nowLocalStr = formatter.format(now);
            const [lh, lm] = nowLocalStr.replace(/[^\d:]/g, '').split(':').map(Number);
            const nowLocalMinutes = lh * 60 + lm;
            const nowUTCMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
            
            let offsetMinutes = nowLocalMinutes - nowUTCMinutes;
            if (offsetMinutes > 840) offsetMinutes -= 1440;
            if (offsetMinutes < -840) offsetMinutes += 1440;

            const targetUTCMinutes = targetTotalMinutes - offsetMinutes;
            const [year, month, day] = todayInTZ.split('-').map(Number);
            const result = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
            result.setUTCMinutes(targetUTCMinutes);
            return result;
        };


        console.log(`Processing ${settings.length} channel settings for auto-schedule...`);

        const matchingEntries: Array<{ setting: any, matchedTime: string, scheduledDate: Date, slotIndex: number }> = [];
        
            for (const s of settings) {
                if (force) {
                    const firstTime = s.schedule_times?.[0] || '00:00';
                    matchingEntries.push({ setting: s, matchedTime: firstTime, scheduledDate: now, slotIndex: 0 });
                    continue;
                }

                if (!s.schedule_times || !Array.isArray(s.schedule_times)) continue;

                const tz = s.timezone || 'UTC';
                const localTimeStr = getLocalHHMM(now, tz);
                const oneMinLater = new Date(now.getTime() + 60000);
                const oneMinBefore = new Date(now.getTime() - 60000);
                const localTimePlus1 = getLocalHHMM(oneMinLater, tz);
                const localTimeMinus1 = getLocalHHMM(oneMinBefore, tz);

                const sortedTimes = [...s.schedule_times].sort();
                
                for (let i = 0; i < sortedTimes.length; i++) {
                    const time = sortedTimes[i];
                    const schedHHMM = time.substring(0, 5); 
                    
                    if (schedHHMM === localTimeStr || schedHHMM === localTimePlus1 || schedHHMM === localTimeMinus1) {
                        console.log(`[MATCH] ${s.channel_name} at ${schedHHMM} (Local: ${localTimeStr})`);
                        const scheduledDate = computeScheduledDate(time, tz, now);
                        matchingEntries.push({ setting: s, matchedTime: time, scheduledDate, slotIndex: i });
                        break; // Only match once per setting per run
                    }
                }
            }

            if (matchingEntries.length === 0) {
                return new Response(JSON.stringify({ success: true, message: "No schedules to process" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

        console.log(`Found ${matchingEntries.length} matching schedules to process`);

        const aiSettings = await getAISettings(supabaseAdmin);
        const results = [];

        for (const { setting, matchedTime, scheduledDate, slotIndex } of matchingEntries) {
            try {
                console.log(`Processing schedule for user ${setting.user_id}, channel ${setting.channel_id}, time=${matchedTime}`);

                // Skip dedup check for forced/manual broadcasts — always allow them
                if (!force) {
                    // DEDUP: Check if a post was already created for this SPECIFIC scheduled time (within ±2 min window)
                    const schedWindowStart = new Date(scheduledDate.getTime() - 2 * 60000);
                    const schedWindowEnd = new Date(scheduledDate.getTime() + 2 * 60000);

                    const { data: existingPosts } = await supabaseAdmin
                        .from("scheduled_telegram_posts")
                        .select("id")
                        .eq("user_id", setting.user_id)
                        .eq("channel_id", setting.channel_id)
                        .gte("scheduled_time", schedWindowStart.toISOString())
                        .lte("scheduled_time", schedWindowEnd.toISOString())
                        .in("status", ["pending", "processing", "sent"])
                        .limit(1);

                    if (existingPosts && existingPosts.length > 0) {
                        console.log(`Skipping channel ${setting.channel_id}: Post already exists for scheduled time ${matchedTime}`);
                        results.push({ channel_id: setting.channel_id, success: true, skipped: true, reason: `Already created for time ${matchedTime}` });
                        continue;
                    }
                } else {
                    console.log(`[FORCE] Skipping dedup check for channel ${setting.channel_id} — forced broadcast`);
                }


                let quizQuestions = [];
                // Sort schedule times and topics for predictable sequential selection
                const sortedTimes = [...setting.schedule_times].sort();

                // Select topic SEQUENTIALLY based on global cycle
                // This ensures rotation across multiple days
                const dayCount = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
                const slotIndex = sortedTimes.findIndex((t: string) => t.startsWith(matchedTime));

                let finalTopic = "";
                const topicsExist = setting.topics && Array.isArray(setting.topics) && setting.topics.length > 0;

                if (topicsExist) {
                    const sortedTopics = [...setting.topics].sort();
                    const globalSlotIndex = (dayCount * sortedTimes.length) + (slotIndex >= 0 ? slotIndex : 0);
                    const topicIndex = globalSlotIndex % sortedTopics.length;
                    finalTopic = sortedTopics[topicIndex];
                    console.log(`Setting ${setting.channel_id}: Predefined Topic Selected: ${finalTopic}`);
                } else {
                    console.log(`Setting ${setting.channel_id}: No topics provided. Generating topic with AI...`);
                    finalTopic = await generateAITopic(setting, aiSettings, slotIndex, supabaseAdmin);
                    console.log(`Setting ${setting.channel_id}: AI Generated Topic: ${finalTopic}`);
                }

                if (setting.source_type === "question_bank") {
                    // SOURCE: QUESTION BANK — fetch questions from the saved bank
                    if (topicsExist) {
                        // Try topic-matched questions first
                        const { data: questions, error: qError } = await supabaseAdmin
                            .from("question_banks")
                            .select("*")
                            .eq("user_id", setting.user_id)
                            .eq("channel_id", setting.channel_id)
                            .ilike("topic", `%${finalTopic}%`)
                            .limit(setting.questions_per_post);

                        if (qError) throw qError;

                        if (questions && questions.length > 0) {
                            quizQuestions = questions;
                        }
                    }

                    // If no topic-matched questions (or no topics at all), pick random from bank
                    if (quizQuestions.length === 0) {
                        console.log(`[auto-schedule] No topic-matched questions, fetching random from bank...`);
                        const { data: randomQuestions, error: rqError } = await supabaseAdmin
                            .from("question_banks")
                            .select("*")
                            .eq("user_id", setting.user_id)
                            .eq("channel_id", setting.channel_id)
                            .limit(setting.questions_per_post);

                        if (rqError) throw rqError;

                        // If channel-specific bank is empty, try all user questions
                        if (!randomQuestions || randomQuestions.length === 0) {
                            const { data: allUserQuestions } = await supabaseAdmin
                                .from("question_banks")
                                .select("*")
                                .eq("user_id", setting.user_id)
                                .limit(setting.questions_per_post);
                            quizQuestions = allUserQuestions || [];
                        } else {
                            quizQuestions = randomQuestions;
                        }
                    }

                    if (quizQuestions.length === 0) {
                        // Only fall back to AI if the question bank is completely empty
                        console.log("[auto-schedule] Question bank is empty, falling back to AI generation");
                        const aiResponse = await generateAIQuiz(setting, finalTopic, aiSettings, supabaseAdmin);
                        quizQuestions = aiResponse.questions;
                    }
                } else {
                    // AI Generated or Knowledge Base Source
                    const aiResponse = await generateAIQuiz(setting, finalTopic, aiSettings, supabaseAdmin);
                    quizQuestions = aiResponse.questions;
                }

                // Prepare quiz data
                const quizLanguage = setting.language || 'bn';
                const quizData = {
                    topic: finalTopic,
                    language: quizLanguage,
                    // Detect quiz language from metadata or text script
                    questions: quizQuestions.map((q: any, index: number) => ({
                        id: index + 1,
                        question: q.question,
                        options: q.options,
                        correct_option_index: q.correct_option_index,
                        explanation: q.explanation || "",
                    })),
                    metadata: {
                        difficulty: "medium",
                        generated_at: new Date().toISOString(),
                        source: setting.source_type,
                        language: quizLanguage,
                        ai_generated_topic: !topicsExist
                    },
                };

                // If previewOnly, return quiz data without inserting into DB
                if (previewOnly) {
                    console.log(`[PREVIEW] Generated quiz for channel ${setting.channel_id}, topic: ${finalTopic}, language: ${quizLanguage}`);
                    results.push({
                        channel_id: setting.channel_id,
                        success: true,
                        preview: {
                            topic: finalTopic,
                            language: quizLanguage,
                            questionCount: quizData.questions.length,
                            questions: quizData.questions,
                        },
                    });
                    continue;
                }

                // Create scheduled post with the ACTUAL scheduled time (not "now")
                const { error: insertError } = await supabaseAdmin
                    .from("scheduled_telegram_posts")
                    .insert({
                        user_id: setting.user_id,
                        chat_id: setting.channels?.telegram_channel_id || setting.channel_id,
                        channel_id: setting.channel_id,
                        quiz_data: quizData,
                        scheduled_time: scheduledDate.toISOString(),
                        status: "pending",
                    });

                if (insertError) {
                    // Handle unique constraint violation (duplicate post for same slot)
                    if (insertError.code === '23505') {
                        console.log(`Skipping channel ${setting.channel_id}: Duplicate post prevented by DB constraint for time ${matchedTime}`);
                        results.push({ channel_id: setting.channel_id, success: true, skipped: true, reason: `Duplicate prevented for time ${matchedTime}` });
                        continue;
                    }
                    throw insertError;
                }

                results.push({ channel_id: setting.channel_id, success: true, scheduled_time: scheduledDate.toISOString() });
                console.log(`Successfully scheduled post for channel ${setting.channel_id} at ${scheduledDate.toISOString()}`);

            } catch (err) {
                console.error(`Error processing schedule for channel ${setting.channel_id}:`, err);
                results.push({ channel_id: setting.channel_id, success: false, error: err instanceof Error ? err.message : String(err) });
            }
        }

        return new Response(JSON.stringify({
            success: true,
            processed: matchingEntries.length,
            results
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Global error in process-auto-schedule:", error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

/**
 * Resolve the best provider + key for auto-schedule functions.
 * Includes validation of model availability with fallback to known-working models.
 */
const OPENROUTER_FALLBACK_MODEL = 'google/gemini-2.0-flash-exp:free';
const RELIABLE_FREE_MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'google/gemini-2.0-flash-lite-preview-02-05:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'mistralai/pixtral-12b:free',
    'deepseek/deepseek-chat:free'
];

function resolveAutoScheduleProvider(aiSettings: AISettings): { provider: string; apiKey: string; model: string } {
    const rawProvider = aiSettings.provider || 'openrouter';
    let apiKey = '';
    let provider = rawProvider === 'lovable' ? 'openrouter' : rawProvider;
    let model = aiSettings.model;

    // Add fallback if model is empty to prevent API errors
    if (!model || model.trim() === '') {
        if (provider === 'gemini') model = 'gemini-2.0-flash';
        else if (provider === 'openai') model = 'gpt-4o-mini';
        else model = 'google/gemini-2.0-flash-exp:free';
    }

    if (provider === 'gemini' && aiSettings.gemini_api_key) {
        apiKey = aiSettings.gemini_api_key;
    } else if (provider === 'openai' && aiSettings.openai_api_key) {
        apiKey = aiSettings.openai_api_key;
    } else if (aiSettings.openrouter_api_key) {
        apiKey = aiSettings.openrouter_api_key;
        provider = 'openrouter';
        if (!model.includes('/')) model = OPENROUTER_FALLBACK_MODEL;
    } else if (aiSettings.gemini_api_key) {
        apiKey = aiSettings.gemini_api_key;
        provider = 'gemini';
        model = 'gemini-2.0-flash';
    } else if (aiSettings.openai_api_key) {
        apiKey = aiSettings.openai_api_key;
        provider = 'openai';
        model = 'gpt-4o-mini';
    }

    // Auto-detect: if model name has 'gemini' and we have a gemini key, prefer direct Gemini
    if (model && model.toLowerCase().includes('gemini') && !model.includes('/') && aiSettings.gemini_api_key) {
        apiKey = aiSettings.gemini_api_key;
        provider = 'gemini';
    }

    return { provider, apiKey, model };
}

async function generateAIQuiz(setting: any, topic: string, aiSettings: AISettings, supabaseAdmin?: any) {
    const { provider, apiKey, model } = resolveAutoScheduleProvider(aiSettings);

    if (!apiKey) throw new Error(`AI API Key missing for ${provider}. Configure in Super Admin → Settings → AI.`);

    const questionCount = setting.questions_per_post || 5;
    const rawLanguage = setting.language || 'bn';
    const customPrompt = setting.custom_prompt || '';

    // Fetch knowledge base content if requested
    let knowledgeBaseContext = '';
    if (setting.source_type === 'knowledge_base' && supabaseAdmin && setting.channel_id) {
        console.log(`[auto-schedule] Fetching knowledge base documents for channel: ${setting.channel_id}`);
        try {
            const { data: documents, error: docError } = await supabaseAdmin
                .from("documents")
                .select("title, extracted_text")
                .eq("channel_id", setting.channel_id)
                .eq("processing_status", "completed")
                .limit(10);

            if (docError) {
                console.error(`[auto-schedule] Error fetching documents:`, docError);
            } else if (documents && documents.length > 0) {
                knowledgeBaseContext = documents
                    .map((doc: { title: string; extracted_text?: string }) => `Document: ${doc.title}\n${doc.extracted_text?.substring(0, 2000) || ''}`)
                    .join('\n\n---\n\n')
                    .substring(0, 8000);
                console.log(`[auto-schedule] Successfully loaded ${documents.length} document(s) for quiz generation context`);
            } else {
                console.warn(`[auto-schedule] No completed documents found in knowledge base for channel: ${setting.channel_id}`);
            }
        } catch (e) {
            console.error(`[auto-schedule] Failed to load knowledge base:`, e);
        }
    }

    // Map language codes to full names and script names
    const languageMap: Record<string, { name: string; script: string; instruction: string }> = {
        'bn': {
            name: 'Bengali',
            script: 'বাংলা',
            instruction: `CRITICAL BENGALI LANGUAGE REQUIREMENTS:
- Every word, question, option, explanation, and the topic must be written in 100% pure Bengali script (বাংলা Unicode).
- Do NOT mix English, Hindi (Devanagari), or any other script inside Bengali words or sentences.
- All technical terms must be transliterated into Bengali script (e.g., use 'ইউপিএসসি' instead of 'UPSC').
- Do NOT use any English/Latin characters (a-z, A-Z) or Hindi/Devanagari characters anywhere in the JSON response.
- Translate the topic title itself into Bengali.
- Ensure proper Unicode encoding.`
        },
        'hi': {
            name: 'Hindi',
            script: 'हिन्दी',
            instruction: `CRITICAL HINDI LANGUAGE REQUIREMENTS:
- Every word, question, option, explanation, and the topic must be written in 100% pure Hindi script (हिन्दी Devanagari).
- Do NOT mix English, Bengali, or any other script inside Hindi words or sentences.
- All technical terms must be transliterated into Devanagari script.
- Do NOT use any English/Latin characters (a-z, A-Z) anywhere in the JSON response.
- Translate the topic title itself into Hindi.
- Ensure proper Unicode encoding.`
        },
        'en': {
            name: 'English',
            script: 'English',
            instruction: 'Write all questions, options, and explanations in English.'
        },
    };

    const langInfo = languageMap[rawLanguage] || languageMap['bn'];
    const quizLanguage = langInfo.name;

    const languageRequirement = `
  ⚠️ MANDATORY LANGUAGE RULE (VIOLATION = FAILURE):
  ${langInfo.instruction}`;

    let basePromptText = `Create a multiple-choice quiz ${knowledgeBaseContext ? `based on the provided Knowledge Base documents` : `about "${topic}"`}.
  
  ${knowledgeBaseContext ? `CRITICAL CONTEXT: Generate the questions directly using the facts and information from this knowledge base content: \n${knowledgeBaseContext}\n` : ""}

  REQUIREMENTS:
  1. Number of questions: ${questionCount}.
  2. Each question must have EXACTLY 4 options.
  3. Use zero-based indexing for "correct_option_index".
  4. The questions MUST be exam-oriented, high-yield, and MOST FREQUENTLY ASKED in competitive exams like UPSC, SSC CGL/CHSL/MTS, Banking IBPS/SBI, Railways RRB, State PSC, WBCS, CTET, NDA, CDS.
  5. Focus on IMPORTANT facts, dates, figures, and concepts that are repeatedly tested in previous year papers.
  6. Include a mix of easy, moderate, and tricky questions to match real exam patterns.
  7. Each explanation should be concise but include the KEY FACT that makes the answer correct (useful for revision).
  8. Don't generate Bangladesh related questions. If the question is related to India, then you can generate it.
  ${languageRequirement}`;

    if (customPrompt) {
        basePromptText += `\n  5. CUSTOM INSTRUCTIONS FROM USER: ${customPrompt}`;
    }

    const jsonRequirement = `\n  ${customPrompt ? '6' : '5'}. Output MUST be ONLY valid JSON matching this schema:
  {
    "questions": [
      {
        "question": "string",
        "options": ["string","string","string","string"],
        "correct_option_index": 0,
        "explanation": "string"
      }
    ]
  }`;

    // Helper validation function
    function validateQuizData(data: any): { valid: boolean; reason?: string } {
      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        return { valid: false, reason: "Quiz structure is missing 'questions' array or is empty." };
      }

      const devanagariRegex = /[\u0900-\u097F]/;
      const englishLetterRegex = /[a-zA-Z]/;

      const checkFieldText = (val: string, label: string): { valid: boolean; reason?: string } => {
        if (typeof val !== "string") return { valid: true };
        
        if (rawLanguage === 'bn') {
          if (devanagariRegex.test(val)) {
            return { valid: false, reason: `${label} contains Hindi/Devanagari characters (e.g., "${val.match(devanagariRegex)?.[0]}")` };
          }
          if (englishLetterRegex.test(val)) {
            return { valid: false, reason: `${label} contains English/Latin letters (e.g., "${val.match(englishLetterRegex)?.[0]}")` };
          }
        } else if (rawLanguage === 'hi') {
          if (englishLetterRegex.test(val)) {
            return { valid: false, reason: `${label} contains English/Latin letters (e.g., "${val.match(englishLetterRegex)?.[0]}")` };
          }
        }
        return { valid: true };
      };

      for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i];
        const qLabel = `Question ${i + 1}`;

        if (!q.question) {
          return { valid: false, reason: `${qLabel} is missing question text.` };
        }
        const qCheck = checkFieldText(q.question, `${qLabel} text`);
        if (!qCheck.valid) return qCheck;

        if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
          return { valid: false, reason: `${qLabel} must have exactly 4 options.` };
        }

        for (let j = 0; j < q.options.length; j++) {
          const optCheck = checkFieldText(q.options[j], `${qLabel} Option ${j + 1}`);
          if (!optCheck.valid) return optCheck;
        }

        if (q.explanation) {
          const expCheck = checkFieldText(q.explanation, `${qLabel} explanation`);
          if (!expCheck.valid) return expCheck;
        }

        if (typeof q.correct_option_index !== 'number' || q.correct_option_index < 0 || q.correct_option_index > 3) {
          return { valid: false, reason: `${qLabel} correct_option_index must be between 0 and 3.` };
        }
      }

      return { valid: true };
    }

    let quizData = null;
    let feedback = "";
    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const prompt = basePromptText + jsonRequirement + (feedback ? `\n\n⚠️ REGENERATION FEEDBACK: ${feedback}` : "");
        let content = "";
        console.log(`[auto-schedule] generateAIQuiz attempt ${attempt}/${maxAttempts}: provider=${provider}, model=${model}`);

        if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                })
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Gemini API error (${res.status}): ${errText.substring(0, 200)}`);
            }
            const data = await res.json();
            content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } else {
            const makeOpenRouterRequest = async (useModel: string) => {
                const url = provider === 'openai' ? "https://api.openai.com/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
                const headers: Record<string, string> = {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                };
                if (provider !== 'openai') {
                    headers["HTTP-Referer"] = "https://telepost.io";
                    headers["X-Title"] = "TelePost AutoSchedule";
                }

                const systemMsg = rawLanguage !== 'en'
                    ? `You are a Quiz Generator. You MUST output ALL content strictly in ${langInfo.script} (${quizLanguage}). ${langInfo.instruction} Output ONLY valid JSON.`
                    : `You are a Quiz Generator. Output ONLY valid JSON.`;

                const res = await fetch(url, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        model: useModel,
                        messages: [
                            { role: "system", content: systemMsg + (feedback ? `\n\n⚠️ REGENERATION FEEDBACK: ${feedback}` : "") },
                            { role: "user", content: prompt }
                        ],
                        temperature: aiSettings.temperature || 0.7,
                    })
                });

                if (!res.ok) {
                    const errText = await res.text();
                    let errorMsg = `AI API error (${res.status})`;
                    try {
                        const errJson = JSON.parse(errText);
                        errorMsg = errJson.error?.message || errJson.message || errorMsg;
                    } catch { 
                        errorMsg = errText.substring(0, 300);
                    }
                    return { ok: false as const, errorMsg, status: res.status };
                }

                const data = await res.json();
                const resultText = data.choices?.[0]?.message?.content || "";
                return { ok: true as const, content: resultText };
            };

            let result = await makeOpenRouterRequest(model);
            const isRateLimited = !result.ok && (result.errorMsg?.toLowerCase().includes("rate limit") || result.errorMsg?.includes("429"));
            
            if (isRateLimited && aiSettings.gemini_api_key) {
                console.log("[generateAIQuiz] Rate limited on OpenRouter, falling back to direct Gemini API...");
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${aiSettings.gemini_api_key}`;
                try {
                    const geminiRes = await fetch(geminiUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                        })
                    });
                    if (geminiRes.ok) {
                        const geminiData = await geminiRes.json();
                        const geminiContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        if (geminiContent) {
                            console.log("[generateAIQuiz] Direct Gemini fallback success.");
                            content = geminiContent;
                        }
                    }
                } catch (e) {
                    console.error("[generateAIQuiz] Direct Gemini fallback failed:", e);
                }
            }

            if (!content) {
                if (!result.ok) {
                    throw new Error(`${provider} API error: ${result.errorMsg} [Model: ${model}]`);
                }
                content = result.content;
            }
        }

        if (!content) {
            throw new Error(`AI returned empty response for quiz generation [Model: ${model}]`);
        }

        // Parse JSON
        const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;
        const parsedData = JSON.parse(jsonStr);

        // Validate
        const validation = validateQuizData(parsedData);
        if (validation.valid) {
            console.log(`[auto-schedule] Quiz validation PASSED on attempt ${attempt}.`);
            quizData = parsedData;
            break;
        } else {
            console.warn(`[auto-schedule] Quiz validation FAILED on attempt ${attempt}: ${validation.reason}`);
            feedback = `Your previous output failed quality validation: ${validation.reason}.
Please regenerate the entire response, ensuring strict adherence to the language rules (100% pure script, absolutely NO characters from other scripts inside the text).`;
        }
      } catch (e: any) {
        console.error(`[auto-schedule] Generation attempt ${attempt} failed:`, e.message);
        lastError = e;
        feedback = `Your previous attempt failed with error: ${e.message}. Please try again and ensure output matches the schema and script requirements.`;
      }
    }

    if (!quizData) {
        throw new Error(`Failed to generate a valid and high-quality quiz after 3 attempts. Last error: ${lastError?.message || "Unknown error"}`);
    }

    return quizData;
}

async function generateAITopic(setting: any, aiSettings: AISettings, slotIndex: number, supabaseAdmin?: any): Promise<string> {
    const { provider, apiKey, model } = resolveAutoScheduleProvider(aiSettings);

    if (!apiKey) throw new Error(`AI API Key missing for ${provider}`);

    const channelName = setting.channels?.name || "Educational Channel";
    const language = setting.language || 'bn';

    // --- DETERMINISTIC SUBJECT ROTATION ---
    // Focus on the 4 subjects requested by the user: General Science, History, Geography, and Static GK
    const subjectRotation = [
        { category: "General Science - Physics", examples: "Laws of Motion, Light, Sound, Electricity, Units, Thermodynamics, Optics" },
        { category: "Indian History - Ancient & Medieval", examples: "Indus Valley, Maurya, Gupta, Mughal Empire, Vijayanagara, Delhi Sultanate" },
        { category: "Indian Geography", examples: "Rivers, Mountains, Climate, Agriculture, Minerals, Soil Types, Passes" },
        { category: "Static GK", examples: "First in India/World, National Symbols, Important Dates, Awards, Books & Authors, UN/WHO/IMF/World Bank" },
        { category: "General Science - Biology", examples: "Human Body Systems, Diseases, Nutrition, Cell Biology, Ecology, Genetics" },
        { category: "Indian History - Modern & Freedom Struggle", examples: "1857 Revolt, Gandhi, Subhas Bose, Independence Movement, Social Reformers" },
        { category: "Static GK - International Organizations", examples: "UN, WHO, IMF, World Bank, BRICS, ASEAN, SAARC" },
        { category: "General Science - Chemistry", examples: "Elements, Acids & Bases, Chemical Reactions, Periodic Table, pH, Alloys" },
        { category: "World Geography", examples: "Continents, Oceans, Famous Lakes, Deserts, Grasslands, Important Straits" },
        { category: "Static GK - Sports & Awards", examples: "Olympics, ICC World Cup, Bharat Ratna, Nobel Prize, Oscar, National Sports Awards" },
        { category: "General Science - Environment & Ecology", examples: "Pollution, Global Warming, Biodiversity, National Parks, Biosphere Reserves" },
        { category: "Indian History - Important Battles & Treaties", examples: "Panipat, Plassey, Buxar, Kalinga, Anglo-Mysore Wars, Treaties of Amritsar/Salbai" },
        { category: "Indian Geography - Climate & Natural Vegetation", examples: "Monsoon, Forests, Soil Types, Natural Resources" },
        { category: "Static GK - Culture & Heritage", examples: "Classical Dances, Folk Art, UNESCO World Heritage Sites in India, Festivals" },
    ];

    // Select subject deterministically: rotate through all subjects across days and slots
    // Using a more stable rotation logic to ensure variety
    const dayCount = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const sortedTimes = setting.schedule_times ? [...setting.schedule_times].sort() : [];
    
    // Find current slot index
    const slotCount = sortedTimes.length || 1;
    
    // Rotation formula that changes every slot and every day
    const globalIndex = (dayCount * 7 + slotIndex) % subjectRotation.length;
    const forcedSubject = subjectRotation[globalIndex];

    console.log(`[generateAITopic] Forced subject rotation: slot=${slotIndex}, day=${dayCount}, index=${globalIndex}, category="${forcedSubject.category}"`);

    // Fetch recently used topics from DB to avoid repetition
    let recentTopicsExclusion = "";
    if (supabaseAdmin) {
        try {
            const { data: recentPosts } = await supabaseAdmin
                .from("scheduled_telegram_posts")
                .select("quiz_data")
                .eq("user_id", setting.user_id)
                .eq("channel_id", setting.channel_id)
                .order("created_at", { ascending: false })
                .limit(15);

            if (recentPosts && recentPosts.length > 0) {
                const recentTopicsList = recentPosts
                    .map((p: any) => p.quiz_data?.topic)
                    .filter(Boolean);
                if (recentTopicsList.length > 0) {
                    recentTopicsExclusion = `\n\nCRITICAL: The following topics were ALREADY USED RECENTLY. Do NOT repeat any of them or use similar topics:\n${recentTopicsList.map((t: string) => `- "${t}"`).join('\n')}`;
                    console.log(`[generateAITopic] Excluding ${recentTopicsList.length} recent topics`);
                }
            }
        } catch (e) {
            console.error("[generateAITopic] Failed to fetch recent topics:", e);
        }
    }

    // Map language code/name to proper name for topic generation
    const topicLangMap: Record<string, { name: string; instruction: string }> = {
        'bn': { name: 'Bengali (বাংলা)', instruction: 'তুমি শুধুমাত্র বাংলায় টপিক দেবে।' },
        'Bengali': { name: 'Bengali (বাংলা)', instruction: 'তুমি শুধুমাত্র বাংলায় টপিক দেবে।' },
        'hi': { name: 'Hindi (हिन्दी)', instruction: 'केवल हिंदी में टॉपिक दें।' },
        'en': { name: 'English', instruction: '' },
    };
    const topicLangInfo = topicLangMap[language] || topicLangMap['bn'];

    const prompt = `Suggest ONE short, specific, and engaging quiz topic (max 4-5 words) suitable for a Telegram channel named "${channelName}".
The topic MUST be highly relevant to competitive government job exams (e.g., SSC CGL, CHSL, MTS, UPSC, Railways RRB, Banking IBPS/SBI, State PSC, WBCS, CTET, NDA, CDS).

MANDATORY SUBJECT CATEGORY FOR THIS QUIZ: **${forcedSubject.category}**
You MUST generate a topic ONLY from this category. Sub-topics to consider: ${forcedSubject.examples}.

CONTENT GUIDELINES:
- Make it dynamic and specific. Example: "Mughal Empire Architecture" instead of just "History", or "RBI Monetary Policy Tools" instead of just "Economy".
- Focus on topics that are MOST FREQUENTLY ASKED in actual exams.
- Do NOT suggest Bangladesh-related topics unless strongly connected to India.
- Do NOT generate generic/broad topics. Be SPECIFIC within the "${forcedSubject.category}" category.
${recentTopicsExclusion}

⚠️ CRITICAL LANGUAGE REQUIREMENT: The topic MUST be written in ${topicLangInfo.name} script ONLY. ${topicLangInfo.instruction}
Output ONLY THE TOPIC STRING in ${topicLangInfo.name}, no quotes, no extra text.`;

    let content = "";
    console.log(`[auto-schedule] generateAITopic: provider=${provider}, model=${model}`);

    try {
        if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                })
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Gemini error (${res.status}): ${errText.substring(0, 200)}`);
            }
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } else {
            const makeTopicRequest = async (useModel: string) => {
                const url = provider === 'openai' ? "https://api.openai.com/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
                const headers: Record<string, string> = {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                };
                if (provider !== 'openai') {
                    headers["HTTP-Referer"] = "https://telepost.io";
                    headers["X-Title"] = "TelePost AutoSchedule";
                }

                // System message to enforce topic language
                const topicSystemMsg = language !== 'en'
                    ? `You output quiz topics ONLY in ${topicLangInfo.name}. ${topicLangInfo.instruction} Output ONLY the topic, nothing else.`
                    : `You output quiz topics. Output ONLY the topic, nothing else.`;

                const res = await fetch(url, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        model: useModel,
                        messages: [
                            { role: "system", content: topicSystemMsg },
                            { role: "user", content: prompt }
                        ],
                        temperature: aiSettings.temperature || 0.7,
                    })
                });

                if (!res.ok) {
                    const errText = await res.text();
                    let errorMsg = `${provider} error (${res.status})`;
                    try {
                        const errJson = JSON.parse(errText);
                        errorMsg = errJson.error?.message || errorMsg;
                    } catch { errorMsg = errText.substring(0, 200); }
                    return { ok: false as const, errorMsg };
                }

            const data = await res.json();
            if (data.error) return { ok: false as const, errorMsg: data.error.message || JSON.stringify(data.error) };
            
            const resultText = data.choices?.[0]?.message?.content || "";
            if (!resultText) {
                console.error(`[auto-schedule] Topic Generation: Empty response from ${provider}:`, JSON.stringify(data, null, 2));
            }
            return { ok: true as const, content: resultText };
        };

        let result = await makeTopicRequest(model);

        // Auto-retry with fallback if model is dead or rate limited
        const isRateLimited = !result.ok && (result.errorMsg?.toLowerCase().includes("rate limit") || result.errorMsg?.includes("429"));
        const isDeadModel = !result.ok && (result.errorMsg?.includes("No endpoints found") || result.errorMsg?.includes("404") || result.errorMsg?.includes("403"));

        if (isRateLimited || isDeadModel) {
            console.warn(`[generateAITopic] Model "${model}" failed (RateLimit: ${isRateLimited}). Trying reliable fallbacks...`);
            
            // If it's a rate limit on OpenRouter, and we have a Gemini key, try Gemini directly
            if (isRateLimited && aiSettings.gemini_api_key) {
                console.log("[generateAITopic] Rate limited on OpenRouter, falling back to direct Gemini API...");
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${aiSettings.gemini_api_key}`;
                try {
                    const geminiRes = await fetch(geminiUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                        })
                    });
                    if (geminiRes.ok) {
                        const geminiData = await geminiRes.json();
                        const geminiContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        if (geminiContent) {
                            console.log("[generateAITopic] Direct Gemini fallback success.");
                            return geminiContent.trim().replace(/^"|"$/g, '');
                        }
                    }
                } catch (e) {
                    console.error("[generateAITopic] Direct Gemini fallback failed:", e);
                }
            }

            for (const fallbackModel of RELIABLE_FREE_MODELS) {
                if (fallbackModel === model) continue;
                console.log(`[generateAITopic] Retrying with fallback: ${fallbackModel}`);
                result = await makeTopicRequest(fallbackModel);
                if (result.ok) {
                    console.log(`[generateAITopic] Fallback success: ${fallbackModel}`);
                    break;
                }
            }
        }

        if (!result.ok) {
            console.error(`[auto-schedule] Topic Generation ${provider} error:`, result.errorMsg);
            throw new Error(result.errorMsg);
        }

        content = result.content;
    }
    } catch (apiErr) {
        console.error(`[auto-schedule] AI Topic Generation Error (${provider}, ${model}):`, apiErr);
        throw apiErr;
    }

    if (!content) {
        console.error(`AI Topic Generation returned empty content for model: ${model}`);
    }

    return content.trim().replace(/^"|"$/g, '');
}
