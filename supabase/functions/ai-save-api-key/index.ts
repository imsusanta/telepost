import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- AES-GCM helpers ---
async function getKey(): Promise<CryptoKey> {
    const secret = Deno.env.get("AI_KEY_ENCRYPTION_SECRET");
    if (!secret) throw new Error("AI_KEY_ENCRYPTION_SECRET not configured");
    const raw = new TextEncoder().encode(secret);
    // Derive a 32-byte key via SHA-256
    const digest = await crypto.subtle.digest("SHA-256", raw);
    return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function toB64(bytes: Uint8Array): string {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
}

export async function encryptValue(plain: string): Promise<string> {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)));
    const packed = new Uint8Array(iv.length + ct.length);
    packed.set(iv, 0);
    packed.set(ct, iv.length);
    return "enc:v1:" + toB64(packed);
}

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
        if (!apiKey || typeof apiKey !== "string") throw new Error("API key is required");

        const encrypted = await encryptValue(apiKey.trim());

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
                    gemini_api_key_encrypted: encrypted,
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
                    gemini_api_key_encrypted: encrypted,
                    api_key_status: "pending",
                });
            dbError = error;
        }

        if (dbError) throw dbError;

        return new Response(
            JSON.stringify({ success: true, message: "API key saved securely" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Failed to save API key" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
