import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Get authenticated user
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("No authorization header");
        }

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
            authHeader.replace("Bearer ", "")
        );

        if (authError || !user) {
            throw new Error("Unauthorized");
        }

        // Parse request body
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new Error("Missing payment details");
        }

        // Get Razorpay secret
        const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
        if (!razorpayKeySecret) {
            throw new Error("Razorpay secret not configured");
        }

        // Verify signature
        const generatedSignature = createHmac("sha256", razorpayKeySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            throw new Error("Invalid payment signature");
        }

        // Payment verified! Update subscription_payments
        const { error: updatePaymentError } = await supabaseClient
            .from("subscription_payments")
            .update({
                razorpay_payment_id: razorpay_payment_id,
                razorpay_signature: razorpay_signature,
                payment_status: "success",
                completed_at: new Date().toISOString(),
            })
            .eq("razorpay_order_id", razorpay_order_id);

        if (updatePaymentError) {
            console.error("Failed to update payment record:", updatePaymentError);
        }

        // Update user profile to paid status
        const { error: updateProfileError } = await supabaseClient
            .from("profiles")
            .update({
                payment_status: "paid",
                razorpay_payment_id: razorpay_payment_id,
                payment_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
            })
            .eq("id", user.id);

        if (updateProfileError) {
            throw new Error("Failed to update user status");
        }

        console.log(`Payment verified for user ${user.id}: ${razorpay_payment_id}`);

        return new Response(
            JSON.stringify({
                success: true,
                message: "Payment verified successfully",
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Payment verification error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
