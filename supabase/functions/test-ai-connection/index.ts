import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { cloudflareChatUrl, CLOUDFLARE_DEFAULT_MODEL, OPENROUTER_DEFAULT_MODEL } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const CLOUDFLARE_FALLBACK_MODEL = CLOUDFLARE_DEFAULT_MODEL;
const OPENROUTER_FALLBACK_MODEL = OPENROUTER_DEFAULT_MODEL;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = Record<string, JsonValue>;

const jsonResponse = (body: JsonObject, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function parseProviderError(provider: string, status: number, body: string): string {
  try {
    const data: unknown = JSON.parse(body);
    const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const error = record.error && typeof record.error === "object" ? record.error as Record<string, unknown> : undefined;
    const errors = Array.isArray(record.errors) ? record.errors : [];
    const firstError = errors[0] && typeof errors[0] === "object" ? errors[0] as Record<string, unknown> : undefined;
    const result = record.result && typeof record.result === "object" ? record.result as Record<string, unknown> : undefined;
    const message = error?.message || firstError?.message || result?.error || record.message || body;
    if (String(message).includes("not available on the Workers Free plan") || status === 403) {
      if (String(message).includes("Workers Free plan")) {
        return `Cloudflare Plan Limit: This model requires Cloudflare Workers Paid plan. Please choose a Free tier model (e.g. @cf/meta/llama-3.3-70b-instruct-fp8-fast, @cf/openai/gpt-oss-120b, @cf/openai/gpt-oss-20b).`;
      }
    }
    return `${provider} error (${status}): ${String(message).substring(0, 500)}`;
  } catch {
    return `${provider} error (${status}): ${body.substring(0, 500)}`;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) return jsonResponse({ success: false, error: "Missing Supabase configuration" }, 500);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ success: false, error: "Authentication required" }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    // This endpoint reads system-level AI configuration and can exercise provider
    // credentials. Only super admins may invoke it.
    const { data: isSuperAdmin, error: roleError } = await supabase.rpc("is_super_admin", { p_user_id: user.id });
    if (roleError) {
      console.error("[test-ai-connection] Super-admin check failed:", roleError);
      return jsonResponse({ success: false, error: "Unable to verify administrator permissions" }, 500);
    }
    if (isSuperAdmin !== true) {
      return jsonResponse({ success: false, error: "Super Admin access required" }, 403);
    }

    const body: Record<string, unknown> = await req.json().catch(() => ({}));
    const { data: settingsRow, error: settingsError } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "ai_settings")
      .maybeSingle();

    if (settingsError) return jsonResponse({ success: false, error: "Failed to load AI configuration" }, 500);
    const dbSettings: Record<string, unknown> = settingsRow?.setting_value && typeof settingsRow.setting_value === "object"
      ? settingsRow.setting_value as Record<string, unknown>
      : {};

    const provider = (body.provider || dbSettings.provider) === "cloudflare" ? "cloudflare" : "openrouter";
    const model = String(body.model || dbSettings.model || "").trim();
    console.log(`[test-ai-connection] user=${user.id}, provider=${provider}, model=${model}`);

    if (provider === "cloudflare") {
      const accountId = String(body.cloudflare_account_id || dbSettings.cloudflare_account_id || Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || "").trim();
      const apiToken = String(body.cloudflare_api_token || dbSettings.cloudflare_api_token || Deno.env.get("CLOUDFLARE_API_TOKEN") || "").trim();
      const cloudflareModel = model || CLOUDFLARE_FALLBACK_MODEL;

      if (!accountId || !apiToken) return jsonResponse({ success: false, error: "Cloudflare Account ID and API token are required." }, 400);
      if (!cloudflareModel.startsWith("@cf/")) return jsonResponse({ success: false, error: "Cloudflare Workers AI model IDs must start with @cf/." }, 400);

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
      if (!response.ok) return jsonResponse({ success: false, error: parseProviderError("Cloudflare", response.status, responseBody) }, response.status >= 500 ? 502 : response.status);

      let data: unknown;
      try {
        data = JSON.parse(responseBody);
      } catch {
        return jsonResponse({ success: false, error: "Cloudflare returned a non-JSON response." }, 502);
      }

      if (!data || typeof data !== "object") return jsonResponse({ success: false, error: "Cloudflare returned an invalid response." }, 502);
      const result = (data as Record<string, unknown>).result;
      const resultRecord = result && typeof result === "object" ? result as Record<string, unknown> : {};
      if ((data as Record<string, unknown>).success === false) {
        return jsonResponse({ success: false, error: parseProviderError("Cloudflare", 502, responseBody) }, 502);
      }

      const choices = Array.isArray(resultRecord.choices) ? resultRecord.choices : [];
      const firstChoice = choices[0] && typeof choices[0] === "object" ? choices[0] as Record<string, unknown> : undefined;
      const message = firstChoice?.message && typeof firstChoice.message === "object" ? firstChoice.message as Record<string, unknown> : undefined;
      const responseText = (typeof resultRecord.response === "string" ? resultRecord.response : undefined)
        || (typeof message?.content === "string" ? message.content : undefined)
        || "";

      if (!responseText) return jsonResponse({ success: false, error: "Cloudflare Workers AI returned an empty response." }, 502);

      return jsonResponse({ success: true, provider: "cloudflare", model: cloudflareModel, response: responseText });
    }

    const apiKey = String(body.openrouter_api_key || dbSettings.openrouter_api_key || Deno.env.get("OPENROUTER_API_KEY") || "").trim();
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
    if (!response.ok) return jsonResponse({ success: false, error: parseProviderError("OpenRouter", response.status, responseBody) }, response.status >= 500 ? 502 : response.status);

    return jsonResponse({ success: true, provider: "openrouter", model: selectedModel, response: "openrouter working" });
  } catch (error) {
    console.error("[test-ai-connection] Error:", error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Error" }, 500);
  }
});
