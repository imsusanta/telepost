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

        // Parse request body. `amount` is accepted for backwards compatibility but
        // is NEVER trusted: the price is resolved server-side below.
        const { amount: clientAmount, planId } = await req.json();

        if (!planId || typeof planId !== "string") {
            throw new Error("Missing plan ID");
        }

        // SECURITY: resolve the price from subscription_plans instead of trusting
        // the client. Previously the order amount came straight from the request
        // body with only an `amount >= 100` (one rupee) floor, so any client could
        // mint a one-rupee order and receive a full year of paid access.
        // The frontend sends the plan NAME as planId (Billing.tsx lowercases it,
        // Pricing.tsx does not), so match case-insensitively.
        const { data: plan, error: planError } = await supabaseClient
            .from("subscription_plans")
            .select("id, name, display_name, price, billing_period, is_active")
            .ilike("name", planId)
            .eq("is_active", true)
            .maybeSingle();

        if (planError) {
            console.error("Failed to look up plan:", planError);
            throw new Error("Could not verify plan pricing");
        }

        if (!plan) {
            console.warn(`Rejected order: unknown or inactive plan "${planId}" requested by user ${user.id}`);
            throw new Error("Unknown or inactive plan");
        }

        const planPrice = Number(plan.price);
        if (!Number.isFinite(planPrice) || planPrice <= 0) {
            console.error(`Plan ${plan.id} (${plan.name}) has an invalid price: ${plan.price}`);
            throw new Error("Plan pricing is not configured correctly");
        }

        // Authoritative amount, in paise.
        const amount = Math.round(planPrice * 100);

        if (typeof clientAmount === "number" && Math.round(clientAmount) !== amount) {
            console.warn(
                `Client-supplied amount ${clientAmount} paise does not match server price ${amount} paise for plan ${plan.name} (user ${user.id}). Using the server price.`
            );
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
                amount: amount, // amount in paise, resolved server-side
                currency: "INR",
                receipt: `receipt_${user.id}_${Date.now()}`,
                notes: {
                    // The webhook identifies the buyer from user_id, never from the
                    // checkout email, which the payer controls.
                    user_id: user.id,
                    email: user.email,
                    plan_id: plan.id,
                    plan_name: plan.name,
                },
            }),
        });

        if (!orderResponse.ok) {
            const errorData = await orderResponse.text();
            console.error("Razorpay order creation failed:", errorData);
            throw new Error("Failed to create Razorpay order");
        }

        const orderData = await orderResponse.json();

        // Save order to subscription_payments table.
        // plan_id references subscription_plans.id, so the resolved UUID is stored
        // here. It previously stored the plan NAME string, which fails the UUID cast.
        const { error: insertError } = await supabaseClient
            .from("subscription_payments")
            .insert({
                user_id: user.id,
                plan_id: plan.id,
                amount: amount / 100, // Convert paise to rupees
                amount_paise: amount,
                plan_billing_period: plan.billing_period || "monthly",
                currency: "INR",
                razorpay_order_id: orderData.id,
                payment_status: "pending",
                description: `Payment for ${plan.display_name || plan.name} plan`,
            });

        if (insertError) {
            // The webhook validates the paid amount against this row, so a failed
            // insert must not be swallowed silently.
            console.error("Failed to save order:", insertError);
            throw new Error("Could not record the order. Please try again.");
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
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
