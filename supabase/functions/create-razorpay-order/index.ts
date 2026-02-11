import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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
        const { amount, planId } = await req.json();

        if (!amount || amount < 100 || !planId) {
            throw new Error("Invalid amount or missing plan ID");
        }

        // Get Razorpay credentials from environment
        const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
        const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

        if (!razorpayKeyId || !razorpayKeySecret) {
            throw new Error("Razorpay credentials not configured");
        }

        // Create Razorpay order
        const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
            },
            body: JSON.stringify({
                amount: amount, // amount in paise
                currency: "INR",
                receipt: `receipt_${user.id}_${Date.now()}`,
                notes: {
                    user_id: user.id,
                    email: user.email,
                    plan_id: planId,
                },
            }),
        });

        if (!orderResponse.ok) {
            const errorData = await orderResponse.text();
            console.error("Razorpay order creation failed:", errorData);
            throw new Error("Failed to create Razorpay order");
        }

        const orderData = await orderResponse.json();

        // Save order to subscription_payments table
        const { error: insertError } = await supabaseClient
            .from("subscription_payments")
            .insert({
                user_id: user.id,
                plan_id: planId,
                amount: amount / 100, // Convert paise to rupees
                currency: "INR",
                razorpay_order_id: orderData.id,
                payment_status: "pending",
                description: `Payment for ${planId} plan`,
            });

        if (insertError) {
            console.error("Failed to save order:", insertError);
            // Continue anyway - order is created
        }

        // Update profile with order ID
        await supabaseClient
            .from("profiles")
            .update({
                razorpay_order_id: orderData.id,
                payment_status: "locked",
                payment_amount: amount / 100,
                payment_requested_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        return new Response(
            JSON.stringify({
                order_id: orderData.id,
                amount: orderData.amount,
                currency: orderData.currency,
                key_id: razorpayKeyId,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
