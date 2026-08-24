import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RAZORPAY_API_ORIGIN = "https:" + "//api.razorpay.com";

/** Length-independent, constant-time hex comparison. */
function signaturesMatch(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let index = 0; index < a.length; index++) {
        mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
    }
    return mismatch === 0;
}

/**
 * Adds whole months, clamping the day so that e.g. Jan 31 + 1 month lands on
 * Feb 28/29 rather than silently rolling into March.
 */
function addMonths(from: Date, months: number): Date {
    const result = new Date(from.getTime());
    const targetDay = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + months);
    const daysInTargetMonth = new Date(
        Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
    ).getUTCDate();
    result.setUTCDate(Math.min(targetDay, daysInTargetMonth));
    return result;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
        const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

        if (!supabaseUrl || !serviceRoleKey || !razorpayKeyId || !razorpayKeySecret) {
            console.error("Missing environment variables");
            return jsonResponse({ error: "Server configuration error" }, 500);
        }

        const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

        // ---- Authentication ------------------------------------------------
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return jsonResponse({ error: "Missing authorization header" }, 401);
        }

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
            authHeader.replace("Bearer ", "")
        );

        if (authError || !user) {
            return jsonResponse({ error: "Unauthorized" }, 401);
        }

        // ---- Input ---------------------------------------------------------
        // camelCase keys are accepted too: older callers sent orderId/paymentId/
        // signature, which silently failed the required-fields check.
        const body = await req.json().catch(() => ({}));
        const orderId: string | undefined = body.razorpay_order_id ?? body.orderId;
        const paymentId: string | undefined = body.razorpay_payment_id ?? body.paymentId;
        const signature: string | undefined = body.razorpay_signature ?? body.signature;

        if (!orderId || !paymentId || !signature) {
            return jsonResponse({ error: "Missing payment details" }, 400);
        }

        // ---- 1. Signature --------------------------------------------------
        // Proves Razorpay paired this payment with this order. It does NOT prove
        // the amount, and it does NOT prove the money was captured.
        const expectedSignature = createHmac("sha256", razorpayKeySecret)
            .update(`${orderId}|${paymentId}`)
            .digest("hex");

        if (!signaturesMatch(signature, expectedSignature)) {
            console.error(`Invalid payment signature for order ${orderId}`);
            return jsonResponse({ error: "Invalid payment signature" }, 400);
        }

        // ---- 2. Ownership --------------------------------------------------
        // Read before writing anything, and scope to the caller so one account
        // cannot settle another account's order.
        const { data: orderRecord, error: orderFetchError } = await supabaseClient
            .from("subscription_payments")
            .select("id, user_id, plan_id, amount, payment_status, razorpay_payment_id")
            .eq("razorpay_order_id", orderId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (orderFetchError) {
            console.error("Failed to load order record:", orderFetchError);
            return jsonResponse({ error: "Could not verify this payment" }, 500);
        }

        if (!orderRecord) {
            console.warn(`No order ${orderId} belonging to user ${user.id}`);
            return jsonResponse({ error: "Payment record not found for this account" }, 404);
        }

        // ---- 3. Idempotency ------------------------------------------------
        // Without this, resubmitting the same signed triple extended the
        // subscription again on every call.
        if (orderRecord.payment_status === "success") {
            console.log(`Order ${orderId} already settled. Not re-granting access.`);
            return jsonResponse({
                success: true,
                already_processed: true,
                message: "Payment was already verified",
            }, 200);
        }

        // ---- 4. Ask Razorpay what actually happened ------------------------
        const paymentResponse = await fetch(
            `${RAZORPAY_API_ORIGIN}/v1/payments/${encodeURIComponent(paymentId)}`,
            {
                headers: {
                    Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
                },
            }
        );

        if (!paymentResponse.ok) {
            const detail = await paymentResponse.text();
            console.error(`Razorpay payment lookup failed (${paymentResponse.status}):`, detail);
            return jsonResponse({ error: "Could not confirm the payment with Razorpay" }, 502);
        }

        const payment = await paymentResponse.json();

        // The payment must belong to the order we are settling. The signature
        // already binds them, but Razorpay is the authority here.
        if (payment.order_id && payment.order_id !== orderId) {
            console.error(
                `Payment ${paymentId} belongs to order ${payment.order_id}, not ${orderId}`
            );
            return jsonResponse({ error: "Payment does not belong to this order" }, 400);
        }

        // 'authorized' means the money is only blocked, not taken. 'refunded',
        // 'failed' and partial refunds must not grant access either.
        if (payment.status !== "captured") {
            console.error(`Payment ${paymentId} is '${payment.status}', not captured.`);
            if (payment.status === "failed") {
                await supabaseClient
                    .from("subscription_payments")
                    .update({ razorpay_payment_id: paymentId, payment_status: "failed" })
                    .eq("id", orderRecord.id);
            }
            return jsonResponse({
                error: "This payment has not been captured yet",
                payment_status: payment.status,
            }, 402);
        }

        // ---- 5. Amount -----------------------------------------------------
        const expectedPaise = Math.round(Number(orderRecord.amount) * 100);
        const paidPaise = Number(payment.amount);
        const refundedPaise = Number(payment.amount_refunded ?? 0);
        const netPaise = paidPaise - (Number.isFinite(refundedPaise) ? refundedPaise : 0);

        if (!Number.isFinite(paidPaise) || netPaise < expectedPaise) {
            console.error(
                `Underpayment for order ${orderId}: net ${netPaise} paise, expected ${expectedPaise} paise.`
            );
            await supabaseClient
                .from("subscription_payments")
                .update({
                    razorpay_payment_id: paymentId,
                    razorpay_signature: signature,
                    payment_status: "underpaid",
                    description: `Underpaid: received ${netPaise / 100}, expected ${orderRecord.amount}`,
                })
                .eq("id", orderRecord.id);

            return jsonResponse({ error: "The amount paid does not cover this order" }, 402);
        }

        // ---- 6. How long does this buy? ------------------------------------
        // Previously profiles said 365 days and subscriptions said 1 month.
        // Both now come from the plan.
        let monthsPurchased = 12;
        let planName: string | null = null;

        if (orderRecord.plan_id) {
            const { data: plan, error: planError } = await supabaseClient
                .from("subscription_plans")
                .select("name, billing_period")
                .eq("id", orderRecord.plan_id)
                .maybeSingle();

            if (planError) {
                console.error("Failed to load plan for billing period:", planError);
            } else if (plan) {
                planName = plan.name;
                monthsPurchased = plan.billing_period === "monthly" ? 1 : 12;
            }
        } else {
            console.warn(
                `Order ${orderId} has no plan_id. Defaulting to a ${monthsPurchased}-month term.`
            );
        }

        const periodStart = new Date();
        const periodEnd = addMonths(periodStart, monthsPurchased);

        // ---- 7. Grant ------------------------------------------------------
        // Every check has passed by this point, so these writes are safe to do.
        const { error: profileError } = await supabaseClient
            .from("profiles")
            .update({
                payment_status: "paid",
                razorpay_payment_id: paymentId,
                payment_expires_at: periodEnd.toISOString(),
            })
            .eq("id", user.id);

        if (profileError) {
            console.error("Failed to grant access:", profileError);
            return jsonResponse({ error: "Failed to update user status" }, 500);
        }

        const { error: settleError } = await supabaseClient
            .from("subscription_payments")
            .update({
                razorpay_payment_id: paymentId,
                razorpay_signature: signature,
                payment_status: "success",
                payment_method: payment.method ?? null,
                completed_at: new Date().toISOString(),
            })
            .eq("id", orderRecord.id);

        if (settleError) {
            // Access was granted, so do not fail the request. The razorpay-webhook
            // will reconcile this row when Razorpay delivers payment.captured.
            console.error("Failed to settle payment row:", settleError);
        }

        // subscriptions.plan_id is NOT NULL, so only touch the table when the
        // plan is actually known. The old code upserted unconditionally.
        if (orderRecord.plan_id) {
            const { error: subscriptionError } = await supabaseClient
                .from("subscriptions")
                .upsert({
                    user_id: user.id,
                    plan_id: orderRecord.plan_id,
                    status: "active",
                    current_period_start: periodStart.toISOString(),
                    current_period_end: periodEnd.toISOString(),
                    cancel_at_period_end: false,
                    updated_at: new Date().toISOString(),
                }, { onConflict: "user_id" });

            if (subscriptionError) {
                console.error("Failed to update subscription:", subscriptionError);
            }
        }

        console.log(
            `Payment ${paymentId} verified for user ${user.id}` +
            `${planName ? ` on plan ${planName}` : ""}, access until ${periodEnd.toISOString()}`
        );

        return jsonResponse({
            success: true,
            message: "Payment verified successfully",
            expires_at: periodEnd.toISOString(),
        }, 200);
    } catch (error: unknown) {
        console.error("Payment verification error:", error);
        return jsonResponse({ error: "Payment verification failed" }, 500);
    }
});
