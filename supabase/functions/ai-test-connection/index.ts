import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const authHeader = req.headers.get("Authorization");
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: { user } } = await supabase.auth.getUser(authHeader!.replace("Bearer ", ""));

        if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

        const { data: settings } = await supabase.from("user_ai_settings").select("*").eq("user_id", user.id).single();
        if (!settings?.gemini_api_key_encrypted) {
            return new Response(JSON.stringify({ error: "Key not found" }), { status: 400, headers: corsHeaders });
        }

        const apiKey = settings.gemini_api_key_encrypted;
        const testModel = "gemini-1.5-flash"; // User level tests default to this

        console.log(`[ai-test-connection] Testing Direct Gemini for ${user.id}`);

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Say 'User Gemini OK'" }] }] })
        });

        if (!res.ok) {
            const err = await res.text();
            return new Response(JSON.stringify({ success: false, message: `[ai-test-connection Gemini Error] ${res.status}: ${err.substring(0, 100)}` }), { status: 200, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: true, message: "Connection successful!", model: testModel }), { headers: corsHeaders });

    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers: corsHeaders });
    }
});
