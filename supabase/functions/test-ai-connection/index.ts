import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { chatCompletion, resolveAIProvider, type AISettings } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = Record<string, JsonValue>;

const jsonResponse = (body: JsonObject, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

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

    const { data: isSuperAdmin, error: roleError } = await supabase.rpc("is_super_admin", { p_user_id: user.id });
    if (roleError) {
      console.error("[test-ai-connection] Super-admin check failed:", roleError);
      return jsonResponse({ success: false, error: "Unable to verify administrator permissions" }, 500);
    }
    if (isSuperAdmin !== true) return jsonResponse({ success: false, error: "Super Admin access required" }, 403);

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

    const requestedProvider = body.provider === "cloudflare" ? "cloudflare" : "openrouter";
    const settings: AISettings = {
      provider: requestedProvider,
      model: String(body.model || dbSettings.model || "").trim(),
      temperature: typeof body.temperature === "number" ? body.temperature : 0,
      system_prompt: typeof body.system_prompt === "string" ? body.system_prompt : undefined,
    };

    const resolved = resolveAIProvider(settings);
    console.log(`[test-ai-connection] user=${user.id}, provider=${resolved.provider}, model=${resolved.model}`);

    const response = await chatCompletion({
      resolved,
      messages: [{ role: "user", content: "Reply with exactly: TelePost AI OK" }],
      temperature: 0,
      maxTokens: 20,
      timeoutMs: 30000,
      appTitle: "TelePost AI Connection Test",
    });

    return jsonResponse({
      success: true,
      provider: resolved.provider,
      model: resolved.model,
      response,
    });
  } catch (error) {
    console.error("[test-ai-connection] Error:", error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "AI connection test failed" }, 500);
  }
});
