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

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

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

        // Get API key
        const { data: settings } = await supabase
            .from("user_ai_settings")
            .select("gemini_api_key_encrypted")
            .eq("user_id", user.id)
            .single();

        if (!settings?.gemini_api_key_encrypted) throw new Error("API key not configured");

        const apiKey = settings.gemini_api_key_encrypted;
        const isOpenRouter = apiKey.startsWith("sk-or-") || apiKey.includes(".");

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
            "1:1": "square format",
            "16:9": "landscape widescreen format",
            "9:16": "portrait mobile format",
        };

        const systemPrompt = `You are an expert at creating image prompts for AI image generation. 
Based on these requirements, create a detailed, specific prompt:
Subject: ${body.prompt}
Style: ${styleDescriptions[body.style]}
Format: ${aspectRatioMap[body.aspectRatio]}
Colors: ${colorDescriptions[body.colorScheme]}

Output ONLY the enhanced prompt, nothing else.`;

        let enhancedPrompt = "";
        const startTime = Date.now();

        if (isOpenRouter) {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-exp:free",
                    messages: [{ role: "user", content: systemPrompt }],
                })
            });
            const data = await response.json();
            enhancedPrompt = data.choices?.[0]?.message?.content;
        } else {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }] }]
                })
            });
            const data = await response.json();
            enhancedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }

        const generationTime = Date.now() - startTime;

        // Log usage
        await supabase.from("ai_usage_logs").insert({
            user_id: user.id,
            request_type: "image_generation",
            prompt: body.prompt,
            generation_time_ms: generationTime,
            success: true,
        });

        return new Response(
            JSON.stringify({
                imageUrl: null,
                enhancedPrompt: enhancedPrompt.trim(),
                generationTimeMs: generationTime,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
