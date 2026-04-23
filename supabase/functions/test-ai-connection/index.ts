import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_FALLBACK_MODEL = 'google/gemini-2.0-flash-exp:free';
const RELIABLE_FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/pixtral-12b:free',
  'deepseek/deepseek-chat:free'
];

// Models known to be dead/removed from OpenRouter
const DEAD_OPENROUTER_MODELS = ['arcee-ai/'];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- AUTHENTICATION CHECK ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    let userId: string | null = null;

    // JWT parse
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
    } catch { /* ignore */ }

    // Fallback: supabase auth
    if (!userId) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) userId = user.id;
      } catch { /* ignore */ }
    }

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    console.log(`[test-ai-connection] user=${userId}, provider=${body.provider || 'auto'}`);

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
        error: `API Key missing for ${finalProvider}. Please configure in Settings → AI.`
        // NOTE: removed debug field that was leaking DB settings
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
        return new Response(JSON.stringify({ success: false, error: `Gemini Error (${res.status}): ${resText.substring(0, 150)}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true, response: "Direct Gemini working!", model: testModel }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // OpenRouter — validate model isn't dead
    let modelToTest = testModel;
    const isDead = DEAD_OPENROUTER_MODELS.some(dead => modelToTest.startsWith(dead) || modelToTest === dead);
    if (isDead) {
      console.warn(`[test-ai-connection] Model "${modelToTest}" is dead, testing with fallback`);
      modelToTest = OPENROUTER_FALLBACK_MODEL;
    }

    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelToTest, messages: [{ role: "user", content: "Say OK" }] })
    });

    if (!orRes.ok) {
      const orText = await orRes.text();
      let errorMsg = `OpenRouter Error (${orRes.status})`;
      try {
        const errJson = JSON.parse(orText);
        errorMsg = errJson.error?.message || errorMsg;
      } catch { errorMsg = orText.substring(0, 150); }

      // If "No endpoints found" or other connection errors, retry with fallbacks
      if ((errorMsg.includes("No endpoints found") || errorMsg.includes("404") || errorMsg.includes("403")) && !RELIABLE_FREE_MODELS.includes(modelToTest)) {
        console.warn(`[test-ai-connection] Model "${modelToTest}" failed/dead, trying reliable fallbacks...`);
        
        for (const fallbackModel of RELIABLE_FREE_MODELS) {
          if (fallbackModel === modelToTest) continue;
          
          const retryRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: fallbackModel, messages: [{ role: "user", content: "Say OK" }] })
          });
          
          if (retryRes.ok) {
            return new Response(JSON.stringify({
              success: true,
              response: `OpenRouter working via fallback! (Note: model "${testModel}" is currently unavailable)`,
              model: fallbackModel,
              warning: `Configured model "${testModel}" is failing. We automatically switched to "${fallbackModel}" for this test.`
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      }

      return new Response(JSON.stringify({ success: false, error: errorMsg }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, response: "OpenRouter working!", model: modelToTest }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
