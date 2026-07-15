// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageGenerationRequest {
    prompt: string;
    style: "realistic" | "cartoon" | "minimalist" | "artistic";
    aspectRatio: "1:1" | "16:9" | "9:16";
    colorScheme: "vibrant" | "pastel" | "dark" | "auto";
}

interface AISettings {
    provider: 'openrouter' | 'lovable' | 'gemini' | 'openai';
    model: string;
    image_model: string;
    openrouter_image_model?: string;
    temperature: number;
    system_prompt?: string;
    openrouter_api_key?: string;
    gemini_api_key?: string;
    openai_api_key?: string;
}

async function getAISettings(supabase: any): Promise<AISettings> {
    try {
        const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'ai_settings').maybeSingle();
        if (data?.setting_value) return data.setting_value as AISettings;
    } catch (e) { console.error("Settings fetch error:", e); }
    return { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free', image_model: 'dall-e-3', openrouter_image_model: 'openai/dall-e-3', temperature: 0.7 };
}

function resolveProvider(aiSettings: AISettings): { finalProvider: string; apiKey: string; model: string } {
    const provider = aiSettings.provider || 'openrouter';
    let apiKey = '';
    let finalProvider = provider;
    let model = aiSettings.image_model || 'dall-e-3';

    if (provider === 'openrouter' || provider === 'lovable') {
        model = aiSettings.openrouter_image_model || 'openai/dall-e-3';
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
        if (aiSettings.openrouter_api_key) {
            apiKey = aiSettings.openrouter_api_key;
            finalProvider = 'openrouter';
            model = aiSettings.openrouter_image_model || 'openai/dall-e-3';
        } else if (aiSettings.openai_api_key) {
            apiKey = aiSettings.openai_api_key;
            finalProvider = 'openai';
            model = aiSettings.image_model || 'dall-e-3';
        } else if (aiSettings.gemini_api_key) {
            apiKey = aiSettings.gemini_api_key;
            finalProvider = 'gemini';
        }
    }

    return { finalProvider, apiKey, model };
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing authorization header");

        const body: ImageGenerationRequest = await req.json();

        // Initialize Supabase
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get user
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error("Unauthorized");

        const aiSettings = await getAISettings(supabase);
        const { finalProvider, apiKey, model } = resolveProvider(aiSettings);

        if (!apiKey) throw new Error("AI Service not configured. Please set API Key in settings.");

        const styleDescriptions = {
            realistic: "photorealistic, high detail, professional photography style",
            cartoon: "cartoon style, colorful, hand-drawn illustration, friendly and approachable",
            minimalist: "minimalist design, clean lines, simple shapes, modern aesthetic",
            artistic: "artistic, creative, painterly, expressive brush strokes, gallery-worthy",
        };

        const colorDescriptions = {
            vibrant: "vibrant and saturated colors, bold color palette",
            pastel: "soft pastel colors, gentle and soothing tones",
            dark: "dark theme, moody lighting, deep shadows",
            auto: "appropriate colors for the subject matter",
        };

        const aspectRatioMap = {
            "1:1": "square (1024x1024)",
            "16:9": "landscape (1792x1024)",
            "9:16": "portrait (1024x1792)",
        };

        const sizeMap = {
            "1:1": "1024x1024",
            "16:9": "1792x1024",
            "9:16": "1024x1792",
        };

        const enhancedPrompt = `A ${styleDescriptions[body.style]} image of: ${body.prompt}. 
        Aspect ratio: ${aspectRatioMap[body.aspectRatio]}. 
        Color scheme: ${colorDescriptions[body.colorScheme]}. 
        High quality, detailed, professional grade.`;

        const startTime = Date.now();
        let imageUrl = null;

        if (finalProvider === 'openai' || (finalProvider === 'openrouter' && model.includes('dall-e'))) {
            // Use OpenAI Images API (or OpenRouter if it proxies this)
            const fetchUrl = finalProvider === 'openai' 
                ? "https://api.openai.com/v1/images/generations" 
                : "https://openrouter.ai/api/v1/images/generations";

            const res = await fetch(fetchUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: model.replace('openai/', ''),
                    prompt: enhancedPrompt,
                    n: 1,
                    size: sizeMap[body.aspectRatio] || "1024x1024",
                })
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Image API error (${res.status}): ${err}`);
            }

            const data = await res.json();
            imageUrl = data.data?.[0]?.url;
        } else if (finalProvider === 'openrouter') {
            // Use OpenRouter Chat Completions for image generation
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://telepost.vercel.app",
                    "X-Title": "TelePost",
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: enhancedPrompt
                                }
                            ]
                        }
                    ],
                    response_format: { type: "json_object" } // Try to get structured response if supported
                })
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`OpenRouter Chat-Image error (${res.status}): ${err}`);
            }

            const data = await res.json();
            // OpenRouter image models usually return the URL in the content or as an attachment/url in the choice
            // We'll check common locations
            imageUrl = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.url;
            
            // If content is a URL, use it. If it's markdown, extract URL.
            if (imageUrl && imageUrl.includes('http')) {
                const urlMatch = imageUrl.match(/https?:\/\/[^\s\)]+/);
                if (urlMatch) imageUrl = urlMatch[0];
            }
        } else if (finalProvider === 'gemini') {
            // Basic Gemini Imagen support if available (requires specific model)
            throw new Error("Direct Gemini image generation is not yet implemented. Please use OpenRouter with a Gemini model instead.");
        } else {
            throw new Error(`Provider ${finalProvider} does not support direct image generation in this version.`);
        }

        const generationTime = Date.now() - startTime;

        // Log usage
        await supabase.from("ai_usage_logs").insert({
            user_id: user.id,
            request_type: "image_generation",
            prompt: body.prompt,
            generation_time_ms: generationTime,
            success: true,
            metadata: { model, provider: finalProvider }
        });

        return new Response(
            JSON.stringify({
                imageUrl: imageUrl,
                enhancedPrompt: enhancedPrompt.trim(),
                generationTimeMs: generationTime,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("[ai-generate-image] Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
