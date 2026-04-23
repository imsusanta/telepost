// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OpenRouter configuration
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_FALLBACK_MODEL = 'google/gemini-2.0-flash-exp:free';
const RELIABLE_FREE_MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'google/gemini-2.0-flash-lite-preview-02-05:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'mistralai/pixtral-12b:free',
    'deepseek/deepseek-chat:free'
];
const DEAD_OPENROUTER_MODELS = ['arcee-ai/'];

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
    return { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free', temperature: 0.7 };
}

/**
 * Resolve the best available provider + API key + model.
 */
function resolveProvider(aiSettings: AISettings): { finalProvider: string; apiKey: string; model: string } {
    const provider = aiSettings.provider || 'openrouter';
    let apiKey = '';
    let finalProvider = provider;
    let model = aiSettings.model;

    const effectiveProvider = provider === 'lovable' ? 'openrouter' : provider;

    if (effectiveProvider === 'gemini' && aiSettings.gemini_api_key) {
        apiKey = aiSettings.gemini_api_key;
        finalProvider = 'gemini';
    } else if (effectiveProvider === 'openai' && aiSettings.openai_api_key) {
        apiKey = aiSettings.openai_api_key;
        finalProvider = 'openai';
    } else if ((effectiveProvider === 'openrouter' || effectiveProvider === 'lovable') && aiSettings.openrouter_api_key) {
        apiKey = aiSettings.openrouter_api_key;
        finalProvider = 'openrouter';
    }

    // FALLBACK
    if (!apiKey) {
        console.warn(`[ai-generate-text] No API key for ${effectiveProvider}, trying fallbacks...`);
        if (aiSettings.openrouter_api_key) {
            apiKey = aiSettings.openrouter_api_key;
            finalProvider = 'openrouter';
            if (!model.includes('/')) model = OPENROUTER_FALLBACK_MODEL;
        } else if (aiSettings.gemini_api_key) {
            apiKey = aiSettings.gemini_api_key;
            finalProvider = 'gemini';
            model = 'gemini-2.0-flash';
        } else if (aiSettings.openai_api_key) {
            apiKey = aiSettings.openai_api_key;
            finalProvider = 'openai';
            model = 'gpt-4o-mini';
        }
    }

    // Auto-detect: if model name has 'gemini' and we have a gemini key, prefer direct Gemini
    if (model.toLowerCase().includes('gemini') && !model.includes('/') && aiSettings.gemini_api_key) {
        apiKey = aiSettings.gemini_api_key;
        finalProvider = 'gemini';
    }

    // Validate OpenRouter model — fallback if dead
    if (finalProvider === 'openrouter') {
        const isDead = DEAD_OPENROUTER_MODELS.some(dead => model.startsWith(dead) || model === dead);
        if (isDead) {
            console.warn(`[ai-generate-text] Model "${model}" is dead, using fallback: ${OPENROUTER_FALLBACK_MODEL}`);
            model = OPENROUTER_FALLBACK_MODEL;
        }
    }

    return { finalProvider, apiKey, model };
}

/**
 * Authenticate request — returns user ID or null
 */
async function authenticateRequest(req: Request, supabase: any): Promise<string | null> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;

    const token = authHeader.replace('Bearer ', '');

    // Method 1: JWT parsing
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.sub) return payload.sub;
    } catch { /* ignore */ }

    // Method 2: supabase auth.getUser
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) return user.id;
    } catch { /* ignore */ }

    return null;
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // --- AUTHENTICATION CHECK ---
        const userId = await authenticateRequest(req, supabase);
        if (!userId) {
            return new Response(
                JSON.stringify({ error: "Authentication required. Please log in." }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { prompt, systemPrompt, temperature = 0.7 } = await req.json();
        if (!prompt) return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400, headers: corsHeaders });

        const aiSettings = await getAISettings(supabase);
        const { finalProvider, apiKey, model } = resolveProvider(aiSettings);

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: `AI সার্ভিস কনফিগার করা হয়নি। Settings এ গিয়ে API Key সেট করুন। (${finalProvider || aiSettings.provider})` }),
                { status: 200, headers: corsHeaders }
            );
        }

        const finalSystemPrompt = (aiSettings.system_prompt || "") + (systemPrompt || "");
        console.log(`[ai-generate-text] user=${userId}, provider=${finalProvider}, model=${model}`);

        if (finalProvider === 'gemini') {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${finalSystemPrompt}\n\nUSER PROMPT: ${prompt}` }] }],
                    generationConfig: { temperature: aiSettings.temperature || temperature || 0.7 }
                })
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Gemini API error (${res.status}): ${err.substring(0, 200)}`);
            }
            const data = await res.json();
            return new Response(JSON.stringify({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' }), { headers: corsHeaders });
        }

        // OpenAI or OpenRouter with retry-on-dead-model
        const makeRequest = async (useModel: string) => {
            const fetchUrl = finalProvider === 'openai' ? "https://api.openai.com/v1/chat/completions" : OPENROUTER_URL;
            const headers: Record<string, string> = {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            };
            if (finalProvider !== 'openai') {
                headers["HTTP-Referer"] = supabaseUrl || "https://telepost.io";
                headers["X-Title"] = "TelePost";
            }

            const res = await fetch(fetchUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    model: useModel,
                    messages: [
                        { role: "system", content: finalSystemPrompt },
                        { role: "user", content: prompt }
                    ],
                    temperature: aiSettings.temperature || temperature,
                })
            });

            if (!res.ok) {
                const err = await res.text();
                let errorMessage = `AI Service error (${res.status})`;
                try {
                    const errorJson = JSON.parse(err);
                    errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
                } catch {
                    errorMessage = err.substring(0, 300) || errorMessage;
                }
                return { ok: false as const, errorMessage };
            }
            const data = await res.json();
            return { ok: true as const, text: data.choices?.[0]?.message?.content || '' };
        };

        let result = await makeRequest(model);

        // Auto-retry with fallback if model is dead or no endpoints found
        if (!result.ok && (result.errorMessage?.includes("No endpoints found") || result.errorMessage?.includes("404") || result.errorMessage?.includes("403"))) {
            console.warn(`[ai-generate-text] Model "${model}" failed/dead. Trying reliable fallbacks...`);
            
            for (const fallbackModel of RELIABLE_FREE_MODELS) {
                if (fallbackModel === model) continue;
                console.log(`[ai-generate-text] Retrying with fallback: ${fallbackModel}`);
                result = await makeRequest(fallbackModel);
                if (result.ok) {
                    console.log(`[ai-generate-text] Fallback success: ${fallbackModel}`);
                    break;
                }
            }
        }

        if (!result.ok) {
            throw new Error(`${result.errorMessage} [Model: ${model}, Provider: ${finalProvider}]`);
        }

        return new Response(JSON.stringify({ text: result.text }), { headers: corsHeaders });

    } catch (error: any) {
        console.error("[ai-generate-text] Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: corsHeaders });
    }
});
