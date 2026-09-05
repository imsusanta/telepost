import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse();

  try {
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
      console.error("Missing environment variables");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      return jsonResponse({ error: "Missing signature" }, 400);
    }

    const expectedSignature = createHmac("sha256", webhookSecret).update(body).digest("hex");
    if (!secretsEqual(signature, expectedSignature)) {
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    const payload = JSON.parse(body);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    switch (payload.event) {
      case "payment.captured": {
        const paymentEntity = payload.payload?.payment?.entity;
        if (!paymentEntity?.id || !paymentEntity?.order_id) {
          return jsonResponse({ error: "Invalid payload" }, 400);
        }

        if (!razorpayKeyId || !razorpayKeySecret) {
          return jsonResponse({ error: "Payment provider is not configured" }, 500);
        }

        const providerPayment = await fetchRazorpayPayment(paymentEntity.id, razorpayKeyId, razorpayKeySecret);
        if (providerPayment.order_id !== paymentEntity.order_id) {
          return jsonResponse({ error: "Payment/order mismatch" }, 400);
        }
        if (!isSuccessfulProviderStatus(providerPayment.status)) {
          return jsonResponse({ error: "Payment is not captured" }, 400);
        }

        const { data, error } = await supabase.rpc("finalize_razorpay_payment", {
          p_order_id: providerPayment.order_id,
          p_payment_id: providerPayment.id,
          p_user_id: null,
          p_paid_paise: Number(providerPayment.amount),
          p_currency: providerPayment.currency,
          p_provider_status: providerPayment.status,
          p_signature: null,
        });

        if (error || data?.success === false) {
          console.error("finalize_razorpay_payment failed:", error?.message || data?.error);
          return jsonResponse({ received: false, error: "Finalization failed" }, 500);
        }

        return jsonResponse({ received: true, already_finalized: data?.already_finalized === true });
      }

      case "payment.failed": {
        const orderId = payload.payload?.payment?.entity?.order_id;
        if (orderId) {
          await supabase
            .from("subscription_payments")
            .update({ payment_status: "failed" })
            .eq("razorpay_order_id", orderId)
            .neq("payment_status", "success");
        }
        return jsonResponse({ received: true });
      }

      default:
        return jsonResponse({ received: true });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return jsonResponse({ received: false, error: "Processing error" }, 500);
  }
});
