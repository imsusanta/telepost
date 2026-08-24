import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { cloudflareChatUrl } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const CLOUDFLARE_FALLBACK_MODEL = "@cf/openai/gpt-oss-20b";
const OPENROUTER_FALLBACK_MODEL = "google/gemini-2.0-flash-exp:free";

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function parseProviderError(provider: string, status: number, body: string): string {
  try {
    const data = JSON.parse(body);
    const message = data?.error?.message || data?.errors?.[0]?.message || data?.result?.error || data?.message || body;
    return `${provider} error (${status}): ${String(message).substring(0, 500)}`;
  } catch {
    return `${provider} error (${status}): ${body.substring(0, 500)}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase configuration");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ success: false, error: "Authentication required" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { data: settingsRow } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "ai_settings")
      .maybeSingle();
    const dbSettings = settingsRow?.setting_value || {};

    const provider = (body.provider || dbSettings.provider) === "cloudflare" ? "cloudflare" : "openrouter";
    const model = String(body.model || dbSettings.model || "").trim();
    console.log(`[test-ai-connection] user=${user.id}, provider=${provider}, model=${model}`);

    if (provider === "cloudflare") {
      const accountId = String(body.cloudflare_account_id || dbSettings.cloudflare_account_id || "").trim();
      const apiToken = String(body.cloudflare_api_token || dbSettings.cloudflare_api_token || "").trim();
      const cloudflareModel = model || CLOUDFLARE_FALLBACK_MODEL;

      if (!accountId || !apiToken) {
        return jsonResponse({ success: false, error: "Cloudflare Account ID and API token are required." }, 400);
      }
      if (!cloudflareModel.startsWith("@cf/")) {
        return jsonResponse({ success: false, error: "Cloudflare Workers AI model IDs must start with @cf/." }, 400);
      }

      const response = await fetch(cloudflareChatUrl(accountId, cloudflareModel), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Reply with exactly: Cloudflare Workers AI OK" }],
          temperature: 0,
          max_tokens: 40,
          stream: false,
        }),
      });

      const responseBody = await response.text();
      if (!response.ok) return jsonResponse({ success: false, error: parseProviderError("Cloudflare", response.status, responseBody) }, response.status);

      let data: any;
      try {
        data = JSON.parse(responseBody);
      } catch {
        return jsonResponse({ success: false, error: "Cloudflare returned a non-JSON response." }, 502);
      }

      if (data?.success === false) {
        return jsonResponse({ success: false, error: parseProviderError("Cloudflare", 500, responseBody) }, 502);
      }

      const responseText = data?.result?.response
        || data?.result?.choices?.[0]?.message?.content
        || data?.choices?.[0]?.message?.content
        || "";
      if (!responseText) return jsonResponse({ success: false, error: "Cloudflare Workers AI returned an empty response." }, 502);

      return jsonResponse({
        success: true,
        provider: "cloudflare",
        model: cloudflareModel,
        response: responseText,
      });
    }

    const apiKey = String(body.openrouter_api_key || dbSettings.openrouter_api_key || "").trim();
    const selectedModel = model || OPENROUTER_FALLBACK_MODEL;
    if (!apiKey) return jsonResponse({ success: false, error: "OpenRouter API key is missing." }, 400);

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://telepost.tech",
        "X-Title": "TelePost",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 20,
      }),
    });

    const responseBody = await response.text();
    if (!response.ok) return jsonResponse({ success: false, error: parseProviderError("OpenRouter", response.status, responseBody) }, response.status);

    return jsonResponse({ success: true, provider: "openrouter", model: selectedModel, response: "openrouter working" });
  } catch (error) {
    console.error("[test-ai-connection] Error:", error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Error" }, 500);
  }
});
