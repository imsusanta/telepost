import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { classifyBearer, extractBearer } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { secretsEqual } from "../_shared/crypto.ts";
import { isSuccessfulProviderStatus } from "../_shared/entitlement.ts";

async function fetchRazorpayPayment(paymentId: string, keyId: string, keySecret: string) {
  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` },
  });
  if (!response.ok) {
    throw new Error("Could not verify payment with provider");
  }
  return await response.json() as {
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const classified = classifyBearer({
      authorizationHeader: req.headers.get("Authorization"),
      cronSecretHeader: null,
      cronSecret: null,
      serviceRoleKey,
    });
    if (classified !== "user-or-unknown") {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await userClient.auth.getUser(
      extractBearer(req.headers.get("Authorization")),
    );
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return jsonResponse({ error: "Missing payment details" }, 400);
    }

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    if (!razorpayKeySecret || !razorpayKeyId) {
      return jsonResponse({ error: "Payment provider is not configured" }, 500);
    }

    const generatedSignature = createHmac("sha256", razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (!secretsEqual(generatedSignature, String(razorpay_signature))) {
      return jsonResponse({ error: "Invalid payment signature" }, 400);
    }

    const providerPayment = await fetchRazorpayPayment(String(razorpay_payment_id), razorpayKeyId, razorpayKeySecret);
    if (providerPayment.order_id !== razorpay_order_id) {
      return jsonResponse({ error: "Payment does not belong to this order" }, 400);
    }
    if (providerPayment.currency !== "INR") {
      return jsonResponse({ error: "Currency mismatch" }, 400);
    }
    if (!isSuccessfulProviderStatus(providerPayment.status)) {
      return jsonResponse({ error: "Payment is not captured" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await admin.rpc("finalize_razorpay_payment", {
      p_order_id: razorpay_order_id,
      p_payment_id: razorpay_payment_id,
      p_user_id: user.id,
      p_paid_paise: Number(providerPayment.amount),
      p_currency: providerPayment.currency,
      p_provider_status: providerPayment.status,
      p_signature: razorpay_signature,
    });

    if (error || data?.success === false) {
      console.error("finalize_razorpay_payment failed:", error?.message || data?.error);
      return jsonResponse({ error: "Payment could not be finalized" }, 400);
    }

    return jsonResponse({
      success: true,
      already_finalized: data?.already_finalized === true,
      message: data?.already_finalized ? "Payment already verified" : "Payment verified successfully",
      period_end: data?.period_end,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return jsonResponse({ error: "Payment verification failed" }, 400);
  }
});
