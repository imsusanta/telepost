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
    
    // Add fallback if model is empty to prevent API errors
    if (!model || model.trim() === '') {
        if (provider === 'gemini') model = 'gemini-2.0-flash';
        else if (provider === 'openai') model = 'gpt-4o-mini';
        else model = OPENROUTER_FALLBACK_MODEL;
    }

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
    if (model && model.toLowerCase().includes('gemini') && !model.includes('/') && aiSettings.gemini_api_key) {
        apiKey = aiSettings.gemini_api_key;
        finalProvider = 'gemini';
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
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Combine prompts effectively
        // If a systemPrompt is provided by the frontend, we use it as the primary instruction.
        // We separate "Global Knowledge/Style" from "Specific Task Instruction".
        let finalSystemPrompt = "";
        if (systemPrompt) {
            // Heuristic: If global prompt is heavily about MCQs but we're doing a post, 
            // we should emphasize the post instructions.
            const isQuizPrompt = aiSettings.system_prompt?.toLowerCase().includes('mcq') || aiSettings.system_prompt?.toLowerCase().includes('question');
            const isPostRequest = systemPrompt.toLowerCase().includes('post') || systemPrompt.toLowerCase().includes('social media');
            
            if (isQuizPrompt && isPostRequest) {
                // If it's a post request but the global prompt is about quizzes, 
                // we only use the global prompt as a "Style Guide" if it doesn't conflict, 
                // or we just prepend it but wrap it in a "General Style" block.
                finalSystemPrompt = `${systemPrompt}\n\n[GENERAL STYLE & LANGUAGE RULES]:\n${aiSettings.system_prompt}`;
            } else {
                finalSystemPrompt = systemPrompt + (aiSettings.system_prompt ? "\n\n" : "") + (aiSettings.system_prompt || "");
            }
        } else {
            finalSystemPrompt = aiSettings.system_prompt || "You are a helpful AI assistant.";
        }

        console.log(`Using system prompt: ${finalSystemPrompt.substring(0, 100)}...`);
        console.log(`[ai-generate-text] user=${userId}, provider=${finalProvider}, model=${model}`);

        async function attemptGeneration(currentModel: string, currentProvider: string, currentApiKey: string) {
            if (currentProvider === 'gemini') {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${currentApiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `${finalSystemPrompt}\n\nUSER PROMPT: ${prompt}` }] }],
                        generationConfig: { 
                            temperature: aiSettings.temperature || temperature || 0.7,
                            maxOutputTokens: 2048
                        }
                    })
                });

                if (!res.ok) {
                    const err = await res.text();
                    throw new Error(`Gemini error: ${err}`);
                }
                const data = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (!text) throw new Error("Gemini returned empty response");
                return text;
            }

            // OpenAI or OpenRouter
            const fetchUrl = currentProvider === 'openai' ? "https://api.openai.com/v1/chat/completions" : OPENROUTER_URL;
            const headers: Record<string, string> = {
                "Authorization": `Bearer ${currentApiKey}`,
                "Content-Type": "application/json",
            };
            if (currentProvider !== 'openai') {
                headers["HTTP-Referer"] = "https://telepost.io";
                headers["X-Title"] = "TelePost";
            }

            const res = await fetch(fetchUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    model: currentModel,
                    messages: [
                        { role: "system", content: finalSystemPrompt },
                        { role: "user", content: prompt }
                    ],
                    temperature: aiSettings.temperature || temperature,
                })
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`${currentProvider} error: ${err}`);
            }

            const data = await res.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content;
            } else {
                throw new Error(`Empty response from ${currentProvider}`);
            }
        }

        let text = "";
        let lastError = null;

        // Try primary model
        try {
            text = await attemptGeneration(model, finalProvider, apiKey);
        } catch (e) {
            console.error(`[ai-generate-text] Primary model failed: ${e.message}`);
            lastError = e;
        }

        if (text) {
            // Log successful usage
            try {
                await supabase.from('ai_usage_logs').insert({
                    user_id: userId,
                    feature: 'text-generation',
                    provider: finalProvider,
                    model: model,
                    prompt: prompt,
                    response: text,
                    status: 'success',
                    success: true,
                    tokens_used: 0,
                    completed_at: new Date().toISOString()
                });
            } catch (logError) {
                console.error('[ai-generate-text] Failed to log usage:', logError);
            }

            return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } else {
            // Log failure
            const errorMsg = lastError?.message || "No text returned from AI";
            try {
                await supabase.from('ai_usage_logs').insert({
                    user_id: userId,
                    feature: 'text-generation',
                    provider: finalProvider,
                    model: model,
                    prompt: prompt,
                    status: 'error',
                    success: false,
                    error_message: errorMsg,
                    metadata: { error: errorMsg }
                });
            } catch (logError) {
                console.error('[ai-generate-text] Failed to log error:', logError);
            }
            throw new Error(errorMsg);
        }

    } catch (error) {
        console.error('[ai-generate-text] Error:', error);
        
        return new Response(JSON.stringify({ 
            error: error instanceof Error ? error.message : "An unexpected error occurred",
            stack: error instanceof Error ? error.stack : undefined
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
