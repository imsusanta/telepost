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

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error("Unauthorized");

        const { apiKey } = await req.json();
        if (!apiKey) throw new Error("API key is required");

        // Use a more robust check-then-act approach to avoid upsert issues
        const { data: existing } = await supabase
            .from("user_ai_settings")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

        let dbError;
        if (existing) {
            const { error } = await supabase
                .from("user_ai_settings")
                .update({
                    gemini_api_key_encrypted: apiKey.trim(),
                    api_key_status: "pending",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);
            dbError = error;
        } else {
            const { error } = await supabase
                .from("user_ai_settings")
                .insert({
                    user_id: user.id,
                    gemini_api_key_encrypted: apiKey.trim(),
                    api_key_status: "pending",
                });
            dbError = error;
        }

        if (dbError) throw dbError;

        return new Response(
            JSON.stringify({ success: true, message: "API key saved successfully" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: error.message || "Failed to save API key" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
