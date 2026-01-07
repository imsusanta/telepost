import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Get authorization header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get user from token
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get user's API key
        const { data: settings, error: settingsError } = await supabase
            .from("user_ai_settings")
            .select("gemini_api_key_encrypted")
            .eq("user_id", user.id)
            .single();

        if (settingsError || !settings?.gemini_api_key_encrypted) {
            return new Response(
                JSON.stringify({ error: "API key not configured. Please add your API key in Settings." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const apiKey = settings.gemini_api_key_encrypted;
        let success = false;
        let modelResponse = "unknown";
        let message = "Failed to connect";

        // Determine if it's an OpenRouter key or Gemini key
        // OpenRouter keys usually start with 'sk-or-' or similar, Gemini with 'AIza'
        const isOpenRouter = apiKey.startsWith("sk-or-") || apiKey.includes(".");

        if (isOpenRouter || apiKey.length > 50) {
            // Test via OpenRouter
            const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-exp:free",
                    messages: [{ role: "user", content: "Say OK" }],
                    max_tokens: 10
                })
            });

            if (openRouterResponse.ok) {
                const data = await openRouterResponse.json();
                success = true;
                modelResponse = "google/gemini-2.0-flash-exp:free (via OpenRouter)";
                message = "OpenRouter connection successful!";
            } else {
                const errorData = await openRouterResponse.json().catch(() => ({}));
                message = `OpenRouter Error: ${errorData.error?.message || openRouterResponse.statusText}`;
            }
        } else {
            // Test via Gemini Direct
            const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Say OK" }] }]
                })
            });

            if (geminiResponse.ok) {
                success = true;
                modelResponse = "gemini-1.5-flash";
                message = "Gemini connection successful!";
            } else {
                const errorData = await geminiResponse.json().catch(() => ({}));
                message = `Gemini Error: ${errorData.error?.message || geminiResponse.statusText}`;
            }
        }

        if (success) {
            // Update status to active
            await supabase
                .from("user_ai_settings")
                .update({
                    api_key_status: "active",
                    last_verified_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);

            return new Response(
                JSON.stringify({
                    success: true,
                    model: modelResponse,
                    message: message,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        } else {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: message,
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                message: error instanceof Error ? error.message : "Edge function error",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
