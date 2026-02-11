import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OpenRouter configuration
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface AISettings {
    provider: 'openrouter' | 'lovable' | 'gemini' | 'openai';
    model: string;
    temperature: number;
    system_prompt?: string;
    openrouter_api_key?: string;
    gemini_api_key?: string;
    openai_api_key?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAISettings(supabase: any): Promise<AISettings> {
    try {
        const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'ai_settings').maybeSingle();
        if (data?.setting_value) return data.setting_value as AISettings;
    } catch (e) { console.error("Settings fetch error:", e); }
    return { provider: 'lovable', model: 'openai/gpt-4o-mini', temperature: 0.7 };
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { prompt, systemPrompt, temperature = 0.7 } = await req.json();
        if (!prompt) return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400, headers: corsHeaders });

        const authHeader = req.headers.get("Authorization");
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

        const aiSettings = await getAISettings(supabase);
        const testModel = (aiSettings.model || '').trim();
        const provider = aiSettings.provider || 'openrouter';

        let apiKey = '';
        let finalProvider = '';

        // ABSOLUTE ROUTING: Force Gemini Direct if model has 'gemini'
        if (testModel.toLowerCase().includes('gemini')) {
            apiKey = aiSettings.gemini_api_key!;
            if (apiKey) finalProvider = 'gemini';
        }

        if (!finalProvider) {
            if (provider === 'gemini') {
                finalProvider = 'gemini';
                apiKey = aiSettings.gemini_api_key!;
            } else if (provider === 'openai') {
                finalProvider = 'openai';
                apiKey = aiSettings.openai_api_key!;
            } else {
                finalProvider = 'openrouter';
                apiKey = aiSettings.openrouter_api_key!;
            }
        }

        if (!apiKey) throw new Error(`[ai-generate-text] Key missing for ${finalProvider || provider}`);

        const finalSystemPrompt = (aiSettings.system_prompt || "") + (systemPrompt || "");
        console.log(`[ai-generate-text] Using ${finalProvider} for ${testModel}`);

        if (finalProvider === 'gemini') {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${finalSystemPrompt}\n\nUSER PROMPT: ${prompt}` }] }],
                    generationConfig: { temperature: aiSettings.temperature || temperature || 0.7 }
                })
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`[Gemini Direct Gen Error] ${res.status}: ${err.substring(0, 150)}`);
            }
            const data = await res.json();
            return new Response(JSON.stringify({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' }), { headers: corsHeaders });
        }

        // Default to OpenAI/OpenRouter (simulated here for brevity but logic should match)
        const fetchUrl = finalProvider === 'openai' ? "https://api.openai.com/v1/chat/completions" : OPENROUTER_URL;
        const res = await fetch(fetchUrl, {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: testModel, messages: [{ role: "system", content: finalSystemPrompt }, { role: "user", content: prompt }], temperature: aiSettings.temperature || temperature })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`[${finalProvider} Gen Error] ${res.status}: ${err.substring(0, 150)}`);
        }
        const data = await res.json();
        return new Response(JSON.stringify({ text: data.choices?.[0]?.message?.content }), { headers: corsHeaders });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: corsHeaders });
    }
});
