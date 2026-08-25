import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import {
  chatCompletion,
  resolveAIProvider,
  OPENROUTER_DEFAULT_MODEL,
  type AISettings,
} from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonObject = Record<string, unknown>;

interface GenerateTextRequest {
  prompt?: unknown;
  systemPrompt?: unknown;
  temperature?: unknown;
}

const jsonResponse = (body: JsonObject, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function isAISettings(value: unknown): value is AISettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Record<string, unknown>;
  return (settings.provider === "openrouter" || settings.provider === "cloudflare")
    && typeof settings.model === "string"
    && typeof settings.temperature === "number";
}

async function getAISettings(supabase: SupabaseClient): Promise<AISettings> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "ai_settings")
      .maybeSingle();

    if (!error && data?.setting_value && isAISettings(data.setting_value)) return data.setting_value;
    if (error) console.error("[ai-generate-text] Settings fetch error:", error.message);
  } catch (error) {
    console.error("[ai-generate-text] Settings fetch error:", error);
  }

  return {
    provider: "openrouter",
    model: OPENROUTER_DEFAULT_MODEL,
    image_model: "",
    temperature: 0.7,
  } as AISettings;
}

async function authenticateRequest(req: Request, supabase: SupabaseClient): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) return user.id;
  } catch (error) {
    console.warn("[ai-generate-text] Authentication failed:", error);
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) return jsonResponse({ error: "Missing Supabase configuration" }, 500);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userId = await authenticateRequest(req, supabase);
    if (!userId) return jsonResponse({ error: "Authentication required. Please log in." }, 401);

    let body: GenerateTextRequest;
    try {
      body = await req.json() as GenerateTextRequest;
    } catch {
      return jsonResponse({ error: "Invalid JSON request body" }, 400);
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return jsonResponse({ error: "Prompt is required" }, 400);

    const requestedSystemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : "";
    const requestedTemperature = typeof body.temperature === "number" && Number.isFinite(body.temperature)
      ? body.temperature
      : 0.7;

    const aiSettings = await getAISettings(supabase);
    const resolved = resolveAIProvider(aiSettings);
    const { provider, model, apiKey, accountId } = resolved;

    if (!apiKey || (provider === "cloudflare" && !accountId)) {
      return jsonResponse({
        error: `AI service is not configured. Please configure ${provider} credentials in Super Admin Settings → AI tab.`,
      }, 503);
    }

    let finalSystemPrompt = "";
    if (requestedSystemPrompt) {
      const isQuizPrompt = aiSettings.system_prompt?.toLowerCase().includes("mcq")
        || aiSettings.system_prompt?.toLowerCase().includes("question");
      const isPostRequest = requestedSystemPrompt.toLowerCase().includes("post")
        || requestedSystemPrompt.toLowerCase().includes("social media");
      finalSystemPrompt = isQuizPrompt && isPostRequest
        ? `${requestedSystemPrompt}\n\n[GENERAL STYLE & LANGUAGE RULES]:\n${aiSettings.system_prompt ?? ""}`
        : requestedSystemPrompt + (aiSettings.system_prompt ? `\n\n${aiSettings.system_prompt}` : "");
    } else {
      finalSystemPrompt = aiSettings.system_prompt || "You are a helpful AI assistant.";
    }

    console.log(`[ai-generate-text] user=${userId}, provider=${provider}, model=${model}`);

    try {
      const text = await chatCompletion({
        resolved,
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: aiSettings.temperature ?? requestedTemperature,
        maxTokens: 2048,
        timeoutMs: 90000,
        appTitle: "TelePost",
      });

      if (!text.trim()) return jsonResponse({ error: "AI returned an empty response" }, 502);

      try {
        await supabase.from("ai_usage_logs").insert({
          user_id: userId,
          feature: "text-generation",
          provider,
          model,
          prompt: prompt.substring(0, 2000),
          status: "success",
          success: true,
          tokens_used: 0,
          completed_at: new Date().toISOString(),
        });
      } catch (logError) {
        console.error("[ai-generate-text] Failed to log usage:", logError);
      }

      return jsonResponse({ text, provider, model });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "AI generation failed";
      console.error(`[ai-generate-text] Generation failed: ${errorMessage}`);

      try {
        await supabase.from("ai_usage_logs").insert({
          user_id: userId,
          feature: "text-generation",
          provider,
          model,
          prompt: prompt.substring(0, 2000),
          status: "error",
          success: false,
          error_message: errorMessage.substring(0, 1000),
          metadata: { provider, model },
        });
      } catch (logError) {
        console.error("[ai-generate-text] Failed to log error:", logError);
      }

      return jsonResponse({ error: errorMessage }, 502);
    }
  } catch (error) {
    console.error("[ai-generate-text] Error:", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }, 500);
  }
});
