import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing authorization header");

        const { prompt, tone, length, language, includeEmojis, includeHashtags, includeCTA, includeQuote } = await req.json();

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

        const systemPrompt = `You are an expert Telegram channel post writer. Generate an engaging post for a Telegram channel.
Topic: ${prompt}
Tone: ${tone}
Length: ${length}
Language: ${language}
${includeEmojis ? "Use emojis." : "No emojis."}
${includeHashtags ? "Include hashtags." : "No hashtags."}
${includeCTA ? "Include CTA." : "No CTA."}
${includeQuote ? "Include a quote." : "No quote."}

Generate ONLY the post text.`;

        let resultText = "";

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
            resultText = data.choices?.[0]?.message?.content;
        } else {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }] }]
                })
            });
            const data = await response.json();
            resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }

        // Log usage
        await supabase.from("ai_usage_logs").insert({
            user_id: user.id,
            request_type: "text_generation",
            prompt: prompt,
            success: true
        });

        return new Response(JSON.stringify({ text: resultText }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
