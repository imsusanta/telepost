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
        provider: 'lovable',
        model: 'openai/gpt-4o-mini',
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
        const computeScheduledDate = (timeStr: string, tz: string): Date => {
            const [hh, mm] = timeStr.split(':').map(Number);
            // Build a date for today in the target timezone
            const todayInTZ = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
            // todayInTZ is "YYYY-MM-DD"
            const isoStr = `${todayInTZ}T${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:00`;
            // Parse in the timezone by computing the offset
            const utcGuess = new Date(isoStr + 'Z');
            const localInTZ = getLocalHHMM(utcGuess, tz);
            const [lh, lm] = localInTZ.split(':').map(Number);
            const diffMinutes = (lh * 60 + lm) - (hh * 60 + mm);
            return new Date(utcGuess.getTime() - diffMinutes * 60000);
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

                // Check if topics are defined - skip if no topics
                if (!setting.topics || setting.topics.length === 0) {
                    console.log(`Skipping channel ${setting.channel_id}: No topics defined`);
                    results.push({
                        channel_id: setting.channel_id,
                        success: false,
                        error: "No topics defined - please add topics in Settings"
                    });
                    continue;
                }

                let quizQuestions = [];
                // Sort schedule times and topics for predictable sequential selection
                const sortedTimes = [...setting.schedule_times].sort();
                const sortedTopics = [...setting.topics].sort();

                // Select topic SEQUENTIALLY based on the index of the matched time slot
                // This ensures that at Slot 1 -> Topic 1, Slot 2 -> Topic 2 etc.
                const slotIndex = sortedTimes.findIndex((t: string) => t.startsWith(matchedTime));
                const topicIndex = slotIndex >= 0 ? slotIndex % sortedTopics.length : 0;
                let finalTopic = sortedTopics[topicIndex];

                console.log(`Setting ${setting.channel_id}: Matched ${matchedTime}, SlotIndex ${slotIndex}, TopicIndex ${topicIndex}, Topic: ${finalTopic}`);

                if (setting.source_type === "question_bank") {
                    // Fetch random questions from question bank
                    const { data: questions, error: qError } = await supabaseAdmin
                        .from("question_banks")
                        .select("*")
                        .eq("user_id", setting.user_id)
                        .eq("channel_id", setting.channel_id)
                        .limit(setting.questions_per_post);

                    if (qError) throw qError;

                    if (!questions || questions.length === 0) {
                        const { data: anyQuestions } = await supabaseAdmin
                            .from("question_banks")
                            .select("*")
                            .eq("user_id", setting.user_id)
                            .limit(setting.questions_per_post);

                        quizQuestions = anyQuestions || [];
                    } else {
                        quizQuestions = questions;
                    }

                    if (quizQuestions.length === 0) {
                        throw new Error("No questions found in question bank");
                    }

                    quizQuestions = quizQuestions.sort(() => Math.random() - 0.5);
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

async function generateAIQuiz(setting: any, topic: string, aiSettings: AISettings) {
    const model = aiSettings.model;
    const provider = aiSettings.provider || 'openrouter';

    let apiKey = "";
    if (provider === 'gemini') apiKey = aiSettings.gemini_api_key!;
    else if (provider === 'openai') apiKey = aiSettings.openai_api_key!;
    else apiKey = aiSettings.openrouter_api_key!;

    if (!apiKey) throw new Error(`AI API Key missing for ${provider}`);

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
    if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            })
        });
        const data = await res.json();
        content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
        // OpenRouter / OpenAI
        const url = provider === 'openai' ? "https://api.openai.com/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            })
        });
        const data = await res.json();
        content = data.choices?.[0]?.message?.content || "";
    }

    // Parse JSON
    try {
        const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse AI response:", content);
        throw new Error("AI failed to return valid JSON");
    }
}
