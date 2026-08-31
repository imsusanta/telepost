import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { chatCompletion, resolveAIProvider, type AISettings } from "../_shared/ai-provider.ts";
import { appendUnique, normalizeQuestions, parseQuizPayload, planBatches, tokenBudget, type QuizQuestion } from "../_shared/quiz.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const FALLBACK_MODEL = "google/gemini-2.0-flash-001";
const BATCH_SIZE = 10;
const ATTEMPTS_PER_BATCH = 3;
const OVERALL_DEADLINE_MS = 130000;

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
function isAISettings(value: unknown): value is AISettings { if (!value || typeof value !== "object") return false; const settings = value as Record<string, unknown>; return (settings.provider === "openrouter" || settings.provider === "cloudflare" || settings.provider === "gemini") && typeof settings.model === "string" && typeof settings.temperature === "number"; }
async function getAISettings(supabase: SupabaseClient): Promise<AISettings> { const { data, error } = await supabase.from("system_settings").select("setting_value").eq("setting_key", "ai_settings").maybeSingle(); if (!error && data?.setting_value && isAISettings(data.setting_value)) return data.setting_value; return { provider: "openrouter", model: FALLBACK_MODEL, temperature: 0.7 }; }

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing authorization header" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Missing Supabase configuration" }, 500);
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    let user: { id: string; email?: string } | null = null;
    if (token === serviceRoleKey) user = { id: "00000000-0000-0000-0000-000000000000", email: "service-role@telepost.tech" };
    else { const { data, error: userError } = await supabase.auth.getUser(token); if (userError || !data?.user) return jsonResponse({ error: "Authentication failed. Please log in again." }, 401); user = data.user; }

    let body: Record<string, unknown>; try { body = await req.json() as Record<string, unknown>; } catch { return jsonResponse({ error: "Invalid JSON request body" }, 400); }
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const questionCount = typeof body.questionCount === "number" ? body.questionCount : 10;
    const difficulty = typeof body.difficulty === "string" ? body.difficulty : "medium";
    const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt : "";
    const language = typeof body.language === "string" ? body.language : "bn";
    const channelId = typeof body.channelId === "string" ? body.channelId : undefined;
    const topicIds = Array.isArray(body.knowledgeBaseTopicIds) ? body.knowledgeBaseTopicIds.filter((value): value is string => typeof value === "string" && value.length > 0).slice(0, 20) : [];
    if (!topic) return jsonResponse({ error: "Topic is required" }, 400);

    const hasBengaliScript = /[\u0980-\u09FF]/.test(topic);
    const effectiveLanguage = hasBengaliScript ? "bn" : (language === "hi" || language === "en" ? language : "bn");
    const count = Math.max(1, Math.min(Number(questionCount) || 10, 50));
    const aiSettings = await getAISettings(supabase);
    const resolved = resolveAIProvider(aiSettings);
    if (!resolved.apiKey || (resolved.provider === "cloudflare" && !resolved.accountId)) return jsonResponse({ error: `AI service is not configured. Please set ${resolved.provider} credentials in Super Admin Settings → AI.` }, 503);

    let knowledgeBaseContext = "";
    if (topicIds.length > 0) {
      const { data: kbTopics, error: kbError } = await supabase.from("knowledge_base_topics").select("subject, topic, description, language, prompt_context, channel_id").eq("user_id", user.id).eq("is_active", true).in("id", topicIds);
      if (kbError) return jsonResponse({ error: "Failed to load Knowledge Base topics" }, 500);
      const allowed = (kbTopics ?? []).filter((item: any) => !channelId || !item.channel_id || item.channel_id === channelId);
      knowledgeBaseContext = allowed.map((item: any) => [item.subject ? `Subject: ${item.subject}` : "", `Topic: ${item.topic}`, item.description ? `Description: ${item.description}` : "", item.prompt_context ? `Teacher context: ${item.prompt_context}` : ""].filter(Boolean).join("\n")).join("\n\n---\n\n").substring(0, 12000);
    }

    const languageRules: Record<string, string> = {
      bn: `IMPORTANT LANGUAGE RULE: পুরো quiz বাংলা ভাষায় লিখুন। প্রশ্ন, চারটি option এবং explanation—সবই বাংলায় হবে। ইংরেজি শুধু proper noun, official name, acronym, formula, unit বা প্রচলিত exam term-এর ক্ষেত্রে ব্যবহার করা যাবে। বাংলা বাক্যকে ইংরেজিতে translate করবেন না। বাংলা script ব্যবহার করুন।`,
      hi: "Write questions, options and explanations in Hindi (Devanagari). Widely used English acronyms, names and units may stay in Latin script.",
      en: "Write all content in clear English.",
    };

    const requestId = crypto.randomUUID(); const generatedAt = new Date().toISOString(); const startedAt = Date.now();
    const collected: QuizQuestion[] = []; const batches = planBatches(count, BATCH_SIZE); let lastError: Error | null = null; let lastReason = "";
    for (const batchSize of batches) {
      if (collected.length >= count || Date.now() - startedAt > OVERALL_DEADLINE_MS) break;
      const wanted = Math.min(batchSize, count - collected.length); const avoidList = collected.slice(-15).map((question) => `- ${question.question}`).join("\n");
      for (let attempt = 1; attempt <= ATTEMPTS_PER_BATCH; attempt++) {
        try {
          const baseSystemPrompt = `${aiSettings.system_prompt || ""}\n${systemPrompt}\nYou are an expert Indian competitive-exam question setter.\n${languageRules[effectiveLanguage]}\nGenerate exactly ${wanted} high-quality MCQs about "${topic}" at ${difficulty} difficulty. Each question must have exactly four plausible options and one correct answer. Avoid all/none-of-the-above. Keep questions under 120 characters, options under 80, and explanations under 200. Focus on WBCS, WBP, SSC, Railway, Banking and other Indian government exams. Return JSON only, no markdown or commentary.\n\nSilently verify language and schema before returning.`;
          const userPrompt = `${knowledgeBaseContext ? `Use the following saved Knowledge Base topic context as authoritative context:\n${knowledgeBaseContext}\n\n` : ""}${avoidList ? `Do not repeat these questions:\n${avoidList}\n\n` : ""}Create ${wanted} MCQs. Return valid JSON exactly as {"questions":[{"id":1,"question":"...","options":["...","...","...","..."],"correct_option_index":0,"explanation":"..."}]}.`;
          const text = await chatCompletion({ resolved, messages: [{ role: "system", content: baseSystemPrompt }, { role: "user", content: userPrompt }], temperature: effectiveLanguage === "bn" ? 0.35 : (aiSettings.temperature ?? 0.7), maxTokens: tokenBudget(wanted), timeoutMs: 60000, appTitle: "TelePost QuizMaker" });
          const questions = normalizeQuestions(parseQuizPayload(text), effectiveLanguage);
          if (!questions.length) { lastReason = "The response was not a valid quiz payload."; continue; }
          const before = collected.length; appendUnique(collected, questions, count); if (collected.length > before) { lastReason = ""; break; } lastReason = "All returned questions were duplicates.";
        } catch (error) { lastError = error instanceof Error ? error : new Error(String(error)); lastReason = lastError.message; console.error(`[generate-quiz] Attempt ${attempt} failed: ${lastReason}`); }
      }
    }
    if (!collected.length) return jsonResponse({ error: lastError?.message || lastReason || "The AI could not produce a valid quiz." }, 502);
    const questions = collected.slice(0, count).map((question, index) => ({ ...question, id: index + 1 }));
    const isPartial = questions.length < count; const generationStatus = isPartial ? "partial" : "completed";
    const quizData = { request_id: requestId, topic, questions, metadata: { standard: "Government Competitive Exam Standard", difficulty, generated_at: generatedAt, language: effectiveLanguage, provider: resolved.provider, model: resolved.model, requested_count: count, returned_count: questions.length, partial: isPartial, knowledge_base_topic_ids: topicIds }, status: generationStatus };
    try { await supabase.from("quiz_generations").insert({ user_id: user.id, channel_id: channelId || null, request_id: requestId, topic: topic.substring(0, 200), question_count: questions.length, questions, metadata: { ...quizData.metadata, used_knowledge_base: topicIds.length > 0 }, status: generationStatus }); if (!isPartial) await supabase.rpc("increment_quiz_count", { p_user_id: user.id }); } catch (databaseError) { console.warn("[generate-quiz] Failed to save generation:", databaseError); }
    return jsonResponse(quizData, isPartial ? 206 : 200);
  } catch (error) { console.error("[generate-quiz] Error:", error); return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500); }
});
