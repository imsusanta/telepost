// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_FALLBACK_MODEL = "google/gemini-2.0-flash-exp:free";
const CLOUDFLARE_FALLBACK_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

type AIProvider = "openrouter" | "cloudflare";

interface AISettings {
  provider: AIProvider;
  model: string;
  temperature: number;
  system_prompt?: string;
  openrouter_api_key?: string;
  cloudflare_account_id?: string;
  cloudflare_api_token?: string;
}

type ResolvedProvider = {
  finalProvider: AIProvider;
  apiKey: string;
  accountId?: string;
  model: string;
};

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
    model: OPENROUTER_FALLBACK_MODEL,
    temperature: 0.7,
  };
}

function defaultModel(provider: AIProvider): string {
  return provider === "cloudflare" ? CLOUDFLARE_FALLBACK_MODEL : OPENROUTER_FALLBACK_MODEL;
}

function resolveProvider(settings: AISettings): ResolvedProvider {
  const effectiveProvider: AIProvider = settings.provider === "cloudflare" ? "cloudflare" : "openrouter";
  const model = settings.model?.trim() || defaultModel(effectiveProvider);

  const candidates: ResolvedProvider[] = [];
  if (settings.cloudflare_api_token && settings.cloudflare_account_id) {
    const cloudflareModel = effectiveProvider === "cloudflare" ? model : CLOUDFLARE_FALLBACK_MODEL;
    candidates.push({
      finalProvider: "cloudflare",
      apiKey: settings.cloudflare_api_token,
      accountId: settings.cloudflare_account_id,
      model: cloudflareModel.startsWith("@cf/") ? cloudflareModel : CLOUDFLARE_FALLBACK_MODEL,
    });
  }
  if (settings.openrouter_api_key) {
    candidates.push({
      finalProvider: "openrouter",
      apiKey: settings.openrouter_api_key,
      model: effectiveProvider === "openrouter" ? model : OPENROUTER_FALLBACK_MODEL,
    });
  }

  const selected = candidates.find((candidate) => candidate.finalProvider === effectiveProvider) || candidates[0];
  if (selected) return selected;

  return {
    finalProvider: effectiveProvider,
    apiKey: "",
    accountId: settings.cloudflare_account_id,
    model,
  };
}


async function authenticateRequest(req: Request, supabase: any): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!error && user) return user.id;
  } catch {
    // The caller receives a generic authentication error below.
  }
  return null;
}

function cloudflareChatUrl(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`;
}

function getOpenAICompatibleText(data: any): string {
  return data?.choices?.[0]?.message?.content || data?.result?.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userId = await authenticateRequest(req, supabase);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentication required. Please log in." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, systemPrompt, temperature = 0.7 } = await req.json();
    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiSettings = await getAISettings(supabase);
    const { finalProvider, apiKey, accountId, model } = resolveProvider(aiSettings);

    if (!apiKey || (finalProvider === "cloudflare" && !accountId)) {
      return new Response(JSON.stringify({
        error: `AI সার্ভিস কনফিগার করা হয়নি। Settings এ গিয়ে ${finalProvider} credentials সেট করুন।`,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    console.log(`[ai-generate-text] user=${userId}, provider=${finalProvider}, model=${model}`);

    const attemptGeneration = async (): Promise<string> => {
      if (finalProvider === "gemini") {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${finalSystemPrompt}\n\nUSER PROMPT: ${prompt}` }] }],
            generationConfig: {
              temperature: aiSettings.temperature ?? temperature,
              maxOutputTokens: 2048,
            },
          }),
        });
        if (!response.ok) throw new Error(`Gemini error (${response.status}): ${(await response.text()).substring(0, 500)}`);
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!text) throw new Error("Gemini returned an empty response");
        return text;
      }

      const fetchUrl = finalProvider === "cloudflare"
        ? cloudflareChatUrl(accountId!)
        : finalProvider === "openai"
          ? "https://api.openai.com/v1/chat/completions"
          : OPENROUTER_URL;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      if (finalProvider === "openrouter") {
        headers["HTTP-Referer"] = "https://telepost.tech";
        headers["X-Title"] = "TelePost";
      }

      const response = await fetch(fetchUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: finalSystemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: aiSettings.temperature ?? temperature,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${finalProvider} error (${response.status}): ${errorText.substring(0, 500)}`);
      }

      const text = getOpenAICompatibleText(await response.json());
      if (!text) throw new Error(`${finalProvider} returned an empty response`);
      return text;
    };

    let text = "";
    let lastError: Error | null = null;
    try {
      text = await attemptGeneration();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[ai-generate-text] Generation failed: ${lastError.message}`);
    }

    if (!text) {
      const errorMessage = lastError?.message || "No text returned from AI";
      try {
        await supabase.from("ai_usage_logs").insert({
          user_id: userId,
          feature: "text-generation",
          provider: finalProvider,
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
      throw new Error(errorMessage);
    }

    try {
      await supabase.from("ai_usage_logs").insert({
        user_id: userId,
        feature: "text-generation",
        provider: finalProvider,
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

    return new Response(JSON.stringify({ text, provider: finalProvider, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ai-generate-text] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
