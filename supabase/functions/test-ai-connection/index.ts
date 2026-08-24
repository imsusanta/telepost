import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const CLOUDFLARE_FALLBACK_MODEL = "@cf/meta/llama-3.1-8b-instruct";

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function cloudflareChatUrl(accountId: string): string {
  return `{{https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId}})}/ai/v1/chat/completions`;
}

function parseProviderError(provider: string, status: number, body: string): string {
  try {
    const data = JSON.parse(body);
    const message = data?.error?.message || data?.errors?.[0]?.message || data?.result?.error || body;
    return `${provider} error (${status}): ${String(message).substring(0, 300)}`;
  } catch {
    return `${provider} error (${status}): ${body.substring(0, 300)}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ success: false, error: "Authentication required" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json();
    const { data: settingsRow } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "ai_settings")
      .maybeSingle();
    const dbSettings = settingsRow?.setting_value || {};

    const provider = body.provider || dbSettings.provider || "openrouter";
    const model = String(body.model || dbSettings.model || "").trim();
    console.log(`[test-ai-connection] user=${user.id}, provider=${provider}, model=${model}`);

    if (provider === "cloudflare") {
      const accountId = String(body.cloudflare_account_id || dbSettings.cloudflare_account_id || "").trim();
      const apiToken = String(body.cloudflare_api_token || dbSettings.cloudflare_api_token || "").trim();
      const cloudflareModel = model || CLOUDFLARE_FALLBACK_MODEL;

      if (!accountId || !apiToken) {
        return jsonResponse({ success: false, error: "Cloudflare Account ID and API token are required." });
      }
      if (!cloudflareModel.startsWith("@cf/")) {
        return jsonResponse({ success: false, error: "Cloudflare Workers AI model IDs must start with @cf/." });
      }

      const response = await fetch(cloudflareChatUrl(accountId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: cloudflareModel,
          messages: [{ role: "user", content: "Reply with exactly: Cloudflare Workers AI OK" }],
          temperature: 0,
          max_tokens: 40,
        }),
      });
      const responseBody = await response.text();
      if (!response.ok) return jsonResponse({ success: false, error: parseProviderError("Cloudflare", response.status, responseBody) });

      let responseText = "Cloudflare Workers AI connected successfully";
      try {
        const data = JSON.parse(responseBody);
        responseText = data?.choices?.[0]?.message?.content || data?.result?.choices?.[0]?.message?.content || responseText;
      } catch {
        // Successful non-JSON bodies are reported using the generic success message.
      }
      return jsonResponse({ success: true, provider: "cloudflare", model: cloudflareModel, response: responseText });
    }

    if (provider === "gemini" || (model.toLowerCase().includes("gemini") && !model.includes("/"))) {
      const apiKey = body.gemini_api_key || dbSettings.gemini_api_key;
      const geminiModel = model || "gemini-2.0-flash";
      if (!apiKey) return jsonResponse({ success: false, error: "Gemini API key is missing." });

      const response = await fetch(`{{https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}}}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Say Gemini OK" }] }] }),
      });
      const responseBody = await response.text();
      if (!response.ok) return jsonResponse({ success: false, error: parseProviderError("Gemini", response.status, responseBody) });
      return jsonResponse({ success: true, provider: "gemini", model: geminiModel, response: "Direct Gemini working" });
    }

    const isOpenAI = provider === "openai";
    const apiKey = isOpenAI
      ? body.openai_api_key || dbSettings.openai_api_key
      : body.openrouter_api_key || dbSettings.openrouter_api_key;
    const selectedProvider = isOpenAI ? "openai" : "openrouter";
    const selectedModel = model || (isOpenAI ? "gpt-4o-mini" : "google/gemini-2.0-flash-exp:free");
    if (!apiKey) return jsonResponse({ success: false, error: `API key is missing for ${selectedProvider}.` });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (!isOpenAI) {
      headers["HTTP-Referer"] = "https://telepost.tech";
      headers["X-Title"] = "TelePost";
    }

    const response = await fetch(isOpenAI ? "https://api.openai.com/v1/chat/completions" : OPENROUTER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 20,
      }),
    });
    const responseBody = await response.text();
    if (!response.ok) return jsonResponse({ success: false, error: parseProviderError(selectedProvider, response.status, responseBody) });

    return jsonResponse({ success: true, provider: selectedProvider, model: selectedModel, response: `${selectedProvider} working` });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Error" }, 500);
  }
});
