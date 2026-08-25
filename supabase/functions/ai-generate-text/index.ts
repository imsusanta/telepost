// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
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

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

async function getAISettings(supabase: any): Promise<AISettings> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "ai_settings")
      .maybeSingle();
    if (data?.setting_value) return data.setting_value as AISettings;
  } catch (error) {
    console.error("[ai-generate-text] Settings fetch error:", error);
  }

  return {
    provider: "openrouter",
    model: OPENROUTER_DEFAULT_MODEL,
    temperature: 0.7,
  };
}

async function authenticateRequest(req: Request, supabase: any): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!error && user) return user.id;
  } catch {
    // Auth error handled below
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase configuration");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userId = await authenticateRequest(req, supabase);
    if (!userId) {
      return jsonResponse({ error: "Authentication required. Please log in." }, 200);
    }

    const { prompt, systemPrompt, temperature = 0.7 } = await req.json().catch(() => ({}));
    if (!prompt?.trim()) {
      return jsonResponse({ error: "Prompt is required" }, 200);
    }

    const aiSettings = await getAISettings(supabase);
    const resolved = resolveAIProvider(aiSettings);
    const { provider, model, apiKey, accountId } = resolved;

    if (!apiKey || (provider === "cloudflare" && !accountId)) {
      return jsonResponse({
        error: `AI service is not configured. Please configure ${provider} credentials in Super Admin Settings → AI tab.`,
      }, 200);
    }

    let finalSystemPrompt = "";
    if (systemPrompt) {
      const isQuizPrompt = aiSettings.system_prompt?.toLowerCase().includes("mcq") || aiSettings.system_prompt?.toLowerCase().includes("question");
      const isPostRequest = systemPrompt.toLowerCase().includes("post") || systemPrompt.toLowerCase().includes("social media");
      finalSystemPrompt = isQuizPrompt && isPostRequest
        ? `${systemPrompt}\n\n[GENERAL STYLE & LANGUAGE RULES]:\n${aiSettings.system_prompt}`
        : systemPrompt + (aiSettings.system_prompt ? `\n\n${aiSettings.system_prompt}` : "");
    } else {
      finalSystemPrompt = aiSettings.system_prompt || "You are a helpful AI assistant.";
    }

    console.log(`[ai-generate-text] user=${userId}, provider=${provider}, model=${model}`);

    let text = "";
    let lastError: Error | null = null;
    try {
      text = await chatCompletion({
        resolved,
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: aiSettings.temperature ?? temperature,
        maxTokens: 2048,
        timeoutMs: 90000,
        appTitle: "TelePost",
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[ai-generate-text] Generation failed: ${lastError.message}`);
    }

    if (!text || !text.trim()) {
      const errorMessage = lastError?.message || "AI returned an empty response";
      try {
        await supabase.from("ai_usage_logs").insert({
          user_id: userId,
          feature: "text-generation",
          provider,
          model,
          prompt,
          status: "error",
          success: false,
          error_message: errorMessage,
          metadata: { error: errorMessage },
        });
      } catch (logError) {
        console.error("[ai-generate-text] Failed to log error:", logError);
      }
      return jsonResponse({ error: errorMessage }, 200);
    }

    try {
      await supabase.from("ai_usage_logs").insert({
        user_id: userId,
        feature: "text-generation",
        provider,
        model,
        prompt,
        response: text,
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
    console.error("[ai-generate-text] Error:", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }, 200);
  }
});
