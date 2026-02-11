import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log("[DEBUG test-ai-connection] Received body:", body);

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { model, provider: reqProvider, openrouter_api_key, gemini_api_key, openai_api_key } = body;

    const { data: envData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'ai_settings').maybeSingle();
    const dbSettings = envData?.setting_value || {};

    const testModel = (model || dbSettings.model || '').trim();
    const provider = reqProvider || dbSettings.provider || 'openrouter';

    let apiKey = '';
    let finalProvider = '';

    // RULE 1: If model has "gemini", force gemini direct
    if (testModel.toLowerCase().includes('gemini')) {
      apiKey = gemini_api_key || dbSettings.gemini_api_key;
      finalProvider = 'gemini';
    } else if (provider === 'gemini') {
      apiKey = gemini_api_key || dbSettings.gemini_api_key;
      finalProvider = 'gemini';
    } else if (provider === 'openai') {
      apiKey = openai_api_key || dbSettings.openai_api_key;
      finalProvider = 'openai';
    } else {
      apiKey = openrouter_api_key || dbSettings.openrouter_api_key;
      finalProvider = 'openrouter';
    }

    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: `[test-ai-connection] API Key missing for ${finalProvider}. Received Provider: ${reqProvider}, DB Provider: ${dbSettings.provider}`,
        debug: { body, dbSettings }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (finalProvider === 'gemini') {
      const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${apiKey}`;
      const res = await fetch(gUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Say 'Direct Gemini OK'" }] }] })
      });
      const resText = await res.text();
      if (!res.ok) {
        return new Response(JSON.stringify({ success: false, error: `[Direct Gemini Error] ${res.status}: ${resText.substring(0, 150)}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true, response: "Direct Gemini working!", model: testModel }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Default to OpenRouter for everything else
    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: testModel, messages: [{ role: "user", content: "Say OK" }] })
    });
    const orText = await orRes.text();
    if (!orRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `[OpenRouter Error] ${orRes.status}: ${orText.substring(0, 150)}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ success: true, response: "OpenRouter working!", model: testModel }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Error" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
