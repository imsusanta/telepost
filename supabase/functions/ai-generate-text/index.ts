import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OpenRouter configuration
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface AISettings {
    provider: 'openrouter' | 'lovable';
    model: string;
    temperature: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAISettings(supabase: any): Promise<AISettings> {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'ai_settings')
            .maybeSingle();

        if (data?.setting_value) {
            return data.setting_value as AISettings;
        }
    } catch (error) {
        console.error("Failed to fetch AI settings:", error);
    }

    return {
        provider: 'lovable',
        model: 'openai/gpt-4o-mini',
        temperature: 0.7,
    };
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "No authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        const supabase = createClient(supabaseUrl!, supabaseKey!);
        const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid token" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { prompt, systemPrompt, temperature = 0.7 } = await req.json();

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: "Prompt is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
        if (!OPENROUTER_API_KEY) {
            throw new Error("OPENROUTER_API_KEY not configured");
        }

        const aiSettings = await getAISettings(supabase);
        console.log(`Generating text using OpenRouter (${aiSettings.model})...`);

        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": supabaseUrl!,
                "X-Title": "QuizMaker",
            },
            body: JSON.stringify({
                model: aiSettings.model,
                messages: [
                    { role: "system", content: systemPrompt || "You are a helpful assistant." },
                    { role: "user", content: prompt }
                ],
                temperature: aiSettings.temperature || temperature,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`OpenRouter error (${response.status}):`, errorText);
            let errorMessage = `AI Service failure: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
            } catch (pErr) {
                errorMessage = errorText || errorMessage;
            }
            return new Response(
                JSON.stringify({ error: errorMessage, status: response.status }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const data = await response.json();
        const resultText = data.choices?.[0]?.message?.content;

        // Log usage
        await supabase.from("ai_usage_logs").insert({
            user_id: user.id,
            feature: "text-generation",
            model: aiSettings.model,
        });

        return new Response(
            JSON.stringify({ text: resultText }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("Error in ai-generate-text:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
