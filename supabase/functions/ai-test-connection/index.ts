import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getKey(): Promise<CryptoKey> {
    const secret = Deno.env.get("AI_KEY_ENCRYPTION_SECRET");
    if (!secret) throw new Error("AI_KEY_ENCRYPTION_SECRET not configured");
    const raw = new TextEncoder().encode(secret);
    const digest = await crypto.subtle.digest("SHA-256", raw);
    return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function fromB64(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

async function decryptValue(stored: string): Promise<string> {
    // Backward-compat: raw plaintext values without the enc:v1: prefix
    if (!stored.startsWith("enc:v1:")) return stored;
    const packed = fromB64(stored.slice("enc:v1:".length));
    const iv = packed.slice(0, 12);
    const ct = packed.slice(12);
    const key = await getKey();
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt);
}

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

        let apiKey: string;
        try {
            apiKey = await decryptValue(settings.gemini_api_key_encrypted);
        } catch (e) {
            return new Response(JSON.stringify({ success: false, message: "Failed to decrypt stored key. Please re-save it." }), { status: 200, headers: corsHeaders });
        }
        const testModel = "gemini-1.5-flash";

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

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ success: false, message: msg }), { status: 500, headers: corsHeaders });
    }
});
