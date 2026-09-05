import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import { chatCompletion, resolveAIProvider, OPENROUTER_DEFAULT_MODEL, type AISettings } from "../_shared/ai-provider.ts";
import { composeTelePostSystemPrompt } from "../_shared/prompt-composer.ts";
import { authorizeUserFacingAi, classifyBearer, extractBearer } from "../_shared/auth.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
type JsonObject = Record<string, unknown>;
interface GenerateTextRequest { prompt?: unknown; systemPrompt?: unknown; temperature?: unknown; }
const jsonResponse = (body: JsonObject, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
function isAISettings(value: unknown): value is AISettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Record<string, unknown>;
  return (settings.provider === "openrouter" || settings.provider === "cloudflare" || settings.provider === "gemini") && typeof settings.model === "string" && typeof settings.temperature === "number";
}
async function getAISettings(supabase: SupabaseClient): Promise<AISettings> {
  try {
    const { data, error } = await supabase.from("system_settings").select("setting_value").eq("setting_key", "ai_settings").maybeSingle();
    if (!error && data?.setting_value && isAISettings(data.setting_value)) return data.setting_value;
    if (error) console.error("[ai-generate-text] Settings fetch error:", error.message);
  } catch (error) { console.error("[ai-generate-text] Settings fetch error:", error); }
  return { provider: "openrouter", model: OPENROUTER_DEFAULT_MODEL, image_model: "", temperature: 0.7 } as AISettings;
}
async function authenticateRequest(req: Request, supabase: SupabaseClient, serviceRoleKey?: string): Promise<string | null> {
  const classified = classifyBearer({
    authorizationHeader: req.headers.get("Authorization"),
    cronSecretHeader: req.headers.get("x-cron-secret"),
    cronSecret: Deno.env.get("CRON_SECRET"),
    serviceRoleKey,
  });
  if (classified !== "user-or-unknown") return null;
  const token = extractBearer(req.headers.get("Authorization"));
  if (!token) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    if (authorizeUserFacingAi({ classified, callerUserId: user.id }) !== "allow") return null;
    return user.id;
  } catch (error) {
    console.warn("[ai-generate-text] Authentication failed:", error);
    return null;
  }
}
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL"); const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) return jsonResponse({ error: "Missing Supabase configuration" }, 500);
    const supabase = createClient(supabaseUrl, supabaseServiceKey); const userId = await authenticateRequest(req, supabase, supabaseServiceKey);
    if (!userId) return jsonResponse({ error: "Authentication required. Please log in." }, 401);
    interface GenBody extends GenerateTextRequest { knowledgeBaseTopic?: Record<string, string>; }
    let body: GenBody; try { body = await req.json() as GenBody; } catch { return jsonResponse({ error: "Invalid JSON request body" }, 400); }
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : ""; if (!prompt) return jsonResponse({ error: "Prompt is required" }, 400);
    const requestedSystemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : "";
    const requestedTemperature = typeof body.temperature === "number" && Number.isFinite(body.temperature) ? body.temperature : 0.7;
    const aiSettings = await getAISettings(supabase); const resolved = resolveAIProvider(aiSettings); const { provider, model, apiKey, accountId } = resolved;
    if (!apiKey || (provider === "cloudflare" && !accountId)) return jsonResponse({ error: `AI service is not configured. Please configure ${provider} credentials in Super Admin Settings → AI tab.` }, 503);

    const { data: userPromptData } = await supabase.from("user_ai_system_prompts").select("system_prompt").eq("user_id", userId).maybeSingle();
    const userSystemPrompt = userPromptData?.system_prompt || "";

    let knowledgeBaseContext = "";
    let kbInstructions = "";
    if (body.knowledgeBaseTopic) {
      const kb = body.knowledgeBaseTopic;
      const parts = [`Topic: ${kb.topic_name || ""}`];
      if (kb.subject) parts.push(`Subject: ${kb.subject}`);
      if (kb.description) parts.push(`Description: ${kb.description}`);
      if (kb.exam) parts.push(`Target Exam: ${kb.exam}`);
      if (kb.grade) parts.push(`Grade: ${kb.grade}`);
      knowledgeBaseContext = parts.join("\n");
      if (kb.ai_instructions) kbInstructions = `\n\nTopic Special Instructions:\n${kb.ai_instructions}`;
    }

    const finalSystemPrompt = composeTelePostSystemPrompt({
      platformInstructions: aiSettings.system_prompt || "You are a helpful AI assistant.",
      userSystemPrompt,
      featureInstructions: requestedSystemPrompt,
      knowledgeBaseInstructions: kbInstructions,
      outputRequirements: "Return only the requested post content. Do not include a title, preamble, or commentary unless the feature instructions explicitly require it.",
    });

    const finalPrompt = knowledgeBaseContext ? `Context:\n${knowledgeBaseContext}\n\nUser Request:\n${prompt}` : prompt;

    console.log(`[ai-generate-text] user=${userId}, provider=${provider}, model=${model}`);
    try {
      const text = await chatCompletion({ resolved, messages: [{ role: "system", content: finalSystemPrompt }, { role: "user", content: finalPrompt }], temperature: aiSettings.temperature ?? requestedTemperature, maxTokens: 2048, timeoutMs: 90000, appTitle: "TelePost" });
      if (!text.trim()) return jsonResponse({ error: "AI returned an empty response" }, 502);
      try { await supabase.from("ai_usage_logs").insert({ user_id: userId, feature: "text-generation", provider, model, prompt: prompt.substring(0, 2000), status: "success", success: true, metadata: { usage_source: "provider_usage_not_exposed_by_shared_client" }, completed_at: new Date().toISOString() }); } catch (logError) { console.error("[ai-generate-text] Failed to log usage:", logError); }
      return jsonResponse({ text, provider, model });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "AI generation failed"; console.error(`[ai-generate-text] Generation failed: ${errorMessage}`);
      try { await supabase.from("ai_usage_logs").insert({ user_id: userId, feature: "text-generation", provider, model, prompt: prompt.substring(0, 2000), status: "error", success: false, error_message: errorMessage.substring(0, 1000), metadata: { provider, model } }); } catch (logError) { console.error("[ai-generate-text] Failed to log error:", logError); }
      return jsonResponse({ error: errorMessage }, 502);
    }
  } catch (error) { console.error("[ai-generate-text] Error:", error); return jsonResponse({ error: error instanceof Error ? error.message : "An unexpected error occurred" }, 500); }
});
