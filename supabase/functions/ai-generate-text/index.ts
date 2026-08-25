// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import { chatCompletion, resolveAIProvider, type AISettings } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    model: "google/gemini-2.0-flash-exp:free",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userId = await authenticateRequest(req, supabase);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentication required. Please log in." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, systemPrompt, temperature = 0.7 } = await req.json().catch(() => ({}));
    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiSettings = await getAISettings(supabase);
    const resolved = resolveAIProvider(aiSettings);

    if (!resolved.apiKey || (resolved.provider === "cloudflare" && !resolved.accountId)) {
      return new Response(JSON.stringify({
        error: `AI সার্ভিস কনফিগার করা হয়নি। Settings এ গিয়ে ${resolved.provider} credentials সেট করুন।`,
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

    console.log(`[ai-generate-text] user=${userId}, provider=${resolved.provider}, model=${resolved.model}`);

    let text = "";
    try {
      text = await chatCompletion({
        resolved,
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: aiSettings.temperature ?? temperature,
        maxTokens: 2048,
        timeoutMs: 60000,
      });
    } catch (error: any) {
      console.error(`[ai-generate-text] Generation failed: ${error.message}`);
      const errorMessage = error.message || "Failed to generate text from AI";
      try {
        await supabase.from("ai_usage_logs").insert({
          user_id: userId,
          feature: "text-generation",
          provider: resolved.provider,
          model: resolved.model,
          prompt,
          status: "error",
          success: false,
          error_message: errorMessage,
          metadata: { error: errorMessage },
        });
      } catch (logError) {
        console.error("[ai-generate-text] Failed to log error:", logError);
      }
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "AI returned an empty response" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      await supabase.from("ai_usage_logs").insert({
        user_id: userId,
        feature: "text-generation",
        provider: resolved.provider,
        model: resolved.model,
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

    return new Response(JSON.stringify({ text, provider: resolved.provider, model: resolved.model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ai-generate-text] Fatal error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
