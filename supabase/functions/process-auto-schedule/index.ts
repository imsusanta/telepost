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
            return formatter.format(date).replace(/[^\d:]/g, '');
        };

        // Helper: compute the actual scheduled Date from a "HH:MM" string in a timezone
        // Uses the current UTC time as an anchor to find the correct offset,
        // avoiding cross-midnight miscalculations.
        const computeScheduledDate = (timeStr: string, tz: string): Date => {
            const [hh, mm] = timeStr.split(':').map(Number);
            // Get today's date in the target timezone
            const todayInTZ = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
            // Get the current timezone offset using "now" (which is always valid for today)
            const nowLocalHHMM = getLocalHHMM(now, tz);
            const [nowLH, nowLM] = nowLocalHHMM.split(':').map(Number);
            const nowLocalMinutes = nowLH * 60 + nowLM;
            const nowUTCMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
            // Offset = local - UTC (handles both positive and negative offsets)
            let offsetMinutes = nowLocalMinutes - nowUTCMinutes;
            // Normalize for day boundary crossings (e.g., UTC 23:00 = IST 04:30 next day)
            if (offsetMinutes > 720) offsetMinutes -= 1440;
            if (offsetMinutes < -720) offsetMinutes += 1440;

            // Target time in local minutes since midnight
            const targetLocalMinutes = hh * 60 + mm;
            // Convert to UTC minutes
            const targetUTCMinutes = targetLocalMinutes - offsetMinutes;

            // Build the final UTC date using today's date in the target timezone
            const [year, month, day] = todayInTZ.split('-').map(Number);
            const result = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
            result.setUTCMinutes(targetUTCMinutes);

            return result;
        };

        // Filter matching settings: match if current time is within ±1 minute of a scheduled time
        // This gives a 3-minute window (prev minute, current minute, next minute) to ensure
        // the 60-second polling interval never misses a scheduled time.
        const matchingEntries: Array<{ setting: any, matchedTime: string, scheduledDate: Date }> = [];

        for (const s of settings) {
            if (force) {
                // For forced runs, use first schedule time or now
                const firstTime = s.schedule_times?.[0] || '00:00';
                matchingEntries.push({ setting: s, matchedTime: firstTime, scheduledDate: now });
                continue;
            }

            if (!s.schedule_times || !Array.isArray(s.schedule_times)) continue;

            const tz = s.timezone || 'UTC';
            const localTimeStr = getLocalHHMM(now, tz);
            // Compute 1 minute ahead and 1 minute behind
            const oneMinLater = new Date(now.getTime() + 60000);
            const oneMinBefore = new Date(now.getTime() - 60000);
            const localTimePlus1 = getLocalHHMM(oneMinLater, tz);
            const localTimeMinus1 = getLocalHHMM(oneMinBefore, tz);

            console.log(`Checking Channel ${s.channel_id} (TZ: ${tz}): Local=${localTimeStr}, -1min=${localTimeMinus1}, +1min=${localTimePlus1}, Scheduled: ${s.schedule_times}`);

            for (const time of s.schedule_times) {
                const schedHHMM = time.substring(0, 5); // "HH:MM" from "HH:MM:SS" or "HH:MM"
                if (schedHHMM === localTimeStr || schedHHMM === localTimePlus1 || schedHHMM === localTimeMinus1) {
                    const scheduledDate = computeScheduledDate(schedHHMM, tz);
                    matchingEntries.push({ setting: s, matchedTime: schedHHMM, scheduledDate });
                    break; // Only match once per setting
                }
            }
        }

        if (matchingEntries.length === 0) {
            console.log("No schedules matching current time");
            return new Response(JSON.stringify({ message: "No schedules matching current time" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log(`Found ${matchingEntries.length} matching schedules to process`);

        const aiSettings = await getAISettings(supabaseAdmin);
        const results = [];

        for (const { setting, matchedTime, scheduledDate } of matchingEntries) {
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
                let topicsExist = setting.topics && Array.isArray(setting.topics) && setting.topics.length > 0;

                if (topicsExist) {
                    const sortedTopics = [...setting.topics].sort();
                    const globalSlotIndex = (dayCount * sortedTimes.length) + (slotIndex >= 0 ? slotIndex : 0);
                    const topicIndex = globalSlotIndex % sortedTopics.length;
                    finalTopic = sortedTopics[topicIndex];
                    console.log(`Setting ${setting.channel_id}: Matched ${matchedTime}, DayCount ${dayCount}, GlobalIndex ${globalSlotIndex}, TopicIndex ${topicIndex}, Topic: ${finalTopic}`);
                } else if (setting.source_type === "question_bank") {
                    // No topic needed for random bank selection — skip AI call
                    finalTopic = "Question Bank";
                    console.log(`Setting ${setting.channel_id}: Source=question_bank, no topics — will pick random from bank`);
                } else {
                    // AI Generated Topic if none provided
                    console.log(`Setting ${setting.channel_id}: No topics provided. Generating topic with AI...`);
                    finalTopic = await generateAITopic(setting, aiSettings, supabaseAdmin);
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
                        const aiResponse = await generateAIQuiz(setting, finalTopic, aiSettings);
                        quizQuestions = aiResponse.questions;
                    }
                } else {
                    // AI Generated Source
                    const aiResponse = await generateAIQuiz(setting, finalTopic, aiSettings);
                    quizQuestions = aiResponse.questions;
                }

                // Prepare quiz data
                const quizLanguage = setting.language || 'English';
                const quizData = {
                    topic: finalTopic,
                    language: quizLanguage,
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

// Models known to be dead/removed from OpenRouter
const DEAD_OPENROUTER_MODELS = [
    'arcee-ai/trinity-large-preview:free',
    'arcee-ai/',  // entire provider seems unstable
];

function resolveAutoScheduleProvider(aiSettings: AISettings): { provider: string; apiKey: string; model: string } {
    const rawProvider = aiSettings.provider || 'openrouter';
    let apiKey = '';
    let provider = rawProvider === 'lovable' ? 'openrouter' : rawProvider;
    let model = aiSettings.model;

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

    // Validate OpenRouter model — fallback if known-dead or suspicious
    if (provider === 'openrouter') {
        const isDeadModel = DEAD_OPENROUTER_MODELS.some(dead => model.startsWith(dead) || model === dead);
        if (isDeadModel) {
            console.warn(`[resolveProvider] Model "${model}" is known to be unavailable. Falling back to ${OPENROUTER_FALLBACK_MODEL}`);
            model = OPENROUTER_FALLBACK_MODEL;
        }
    }

    return { provider, apiKey, model };
}

async function generateAIQuiz(setting: any, topic: string, aiSettings: AISettings) {
    const { provider, apiKey, model } = resolveAutoScheduleProvider(aiSettings);

    if (!apiKey) throw new Error(`AI API Key missing for ${provider}. Configure in Super Admin → Settings → AI.`);

    const questionCount = setting.questions_per_post || 5;
    const quizLanguage = setting.language || 'English';
    const customPrompt = setting.custom_prompt || '';

    let languageRequirement = `4. CRITICAL LANGUAGE REQUIREMENT: You MUST generate ALL questions, ALL options, and ALL explanations ENTIRELY in **${quizLanguage}** language.`;
    if (quizLanguage !== 'English') {
        languageRequirement += ` Do NOT use English at all. Every single word must be in ${quizLanguage} script. This is mandatory and non-negotiable.`;
    }

    let promptText = `Create a multiple-choice quiz about "${topic}".
  
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
        promptText += `\n  5. CUSTOM INSTRUCTIONS FROM USER: ${customPrompt}`;
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

    const prompt = promptText + jsonRequirement;

    let content = "";
    console.log(`[auto-schedule] generateAIQuiz: provider=${provider}, model=${model}`);

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
            console.error(`[auto-schedule] Gemini error (${res.status}):`, errText.substring(0, 200));
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

            const res = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    model: useModel,
                    messages: [{ role: "user", content: prompt }],
                    temperature: aiSettings.temperature || 0.7,
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                let errorMsg = `AI API error (${res.status})`;
                try {
                    const errJson = JSON.parse(errText);
                    errorMsg = errJson.error?.message || errJson.message || errorMsg;
                } catch { errorMsg = errText.substring(0, 300); }
                return { ok: false as const, errorMsg, status: res.status };
            }

            const data = await res.json();
            return { ok: true as const, content: data.choices?.[0]?.message?.content || "" };
        };

        // Try with configured model first
        let result = await makeOpenRouterRequest(model);

        // Auto-retry with fallback if model is dead or no endpoints found
        if (!result.ok && (result.errorMsg?.includes("No endpoints found") || result.errorMsg?.includes("404") || result.errorMsg?.includes("403"))) {
            console.warn(`[auto-schedule] Model "${model}" failed/dead. Trying reliable fallbacks...`);
            
            for (const fallbackModel of RELIABLE_FREE_MODELS) {
                if (fallbackModel === model) continue;
                console.log(`[auto-schedule] Retrying with fallback: ${fallbackModel}`);
                result = await makeOpenRouterRequest(fallbackModel);
                if (result.ok) {
                    console.log(`[auto-schedule] Fallback success: ${fallbackModel}`);
                    break;
                }
            }
        }

        if (!result.ok) {
            console.error(`[auto-schedule] ${provider} error:`, result.errorMsg);
            throw new Error(`${provider} API error: ${result.errorMsg} [Model: ${model}]`);
        }

        content = result.content;
    }

    if (!content) {
        throw new Error(`AI returned empty response for quiz generation [Model: ${model}]`);
    }

    // Parse JSON
    try {
        const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse AI response:", content.substring(0, 300));
        throw new Error("AI failed to return valid JSON");
    }
}

async function generateAITopic(setting: any, aiSettings: AISettings, supabaseAdmin?: any): Promise<string> {
    const { provider, apiKey, model } = resolveAutoScheduleProvider(aiSettings);

    if (!apiKey) throw new Error(`AI API Key missing for ${provider}`);

    const channelName = setting.channels?.name || "Educational Channel";
    const language = setting.language || 'English';

    // --- DETERMINISTIC SUBJECT ROTATION ---
    // Instead of relying on AI to "randomly" pick subjects (which causes it to repeat Polity),
    // we force a specific subject category based on day count + time slot.
    const subjectRotation = [
        { category: "General Science - Physics", examples: "Laws of Motion, Light, Sound, Electricity, Units, Thermodynamics, Optics" },
        { category: "Indian History - Ancient & Medieval", examples: "Indus Valley, Maurya, Gupta, Mughal Empire, Vijayanagara, Delhi Sultanate" },
        { category: "Indian Geography", examples: "Rivers, Mountains, Climate, Agriculture, Minerals, Soil Types, Passes" },
        { category: "Static GK", examples: "First in India/World, National Symbols, Important Dates, Awards, Books & Authors, UN/WHO/IMF/World Bank" },
        { category: "General Science - Biology", examples: "Human Body Systems, Diseases, Nutrition, Cell Biology, Ecology, Genetics" },
        { category: "Indian History - Modern & Freedom Struggle", examples: "1857 Revolt, Gandhi, Subhas Bose, Independence Movement, Social Reformers" },
        { category: "Indian Economy", examples: "Five Year Plans, Budget, Banking System, Fiscal Policy, GDP, RBI, SEBI, NABARD" },
        { category: "General Science - Chemistry", examples: "Elements, Acids & Bases, Chemical Reactions, Periodic Table, pH, Alloys" },
        { category: "Environmental Studies & Ecology", examples: "Biodiversity, Climate Change, National Parks, Wildlife Sanctuaries, Pollution" },
        { category: "Indian Polity & Constitution", examples: "Articles, Amendments, Fundamental Rights, Parliament, Judiciary, Panchayati Raj" },
        { category: "Computer Awareness", examples: "MS Office, Networking, Operating Systems, Internet, Shortcuts, Cyber Security" },
        { category: "Current Affairs & Static GK", examples: "Government Schemes, Summits, Appointments, Sports Awards, Census, Dams" },
        { category: "Quantitative Aptitude", examples: "Percentage, Profit & Loss, SI/CI, Ratio, Time & Work, Number System, Averages" },
        { category: "Reasoning & Logic", examples: "Series, Coding-Decoding, Blood Relations, Direction, Syllogism, Analogy, Venn Diagram" },
    ];

    // Select subject deterministically: rotate through all subjects across days and slots
    const dayCount = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const sortedTimes = setting.schedule_times ? [...setting.schedule_times].sort() : [];
    const slotCount = sortedTimes.length || 1;
    // Use a prime multiplier to avoid predictable short cycles  
    const globalIndex = (dayCount * slotCount * 3 + Math.floor(Date.now() / (1000 * 60 * 60))) % subjectRotation.length;
    const forcedSubject = subjectRotation[globalIndex];

    console.log(`[generateAITopic] Forced subject rotation: index=${globalIndex}, category="${forcedSubject.category}"`);

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

REQUIRED LANGUAGE: ${language}.
Output ONLY THE TOPIC STRING, no quotes, no extra text.`;

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

                const res = await fetch(url, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        model: useModel,
                        messages: [{ role: "user", content: prompt }],
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
                return { ok: true as const, content: data.choices?.[0]?.message?.content || "" };
            };

            let result = await makeTopicRequest(model);

            // Auto-retry with fallback if model is dead or no endpoints found
            if (!result.ok && (result.errorMsg?.includes("No endpoints found") || result.errorMsg?.includes("404") || result.errorMsg?.includes("403"))) {
                console.warn(`[generateAITopic] Model "${model}" failed/dead. Trying reliable fallbacks...`);
                
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
