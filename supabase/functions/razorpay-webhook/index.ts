import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Length-independent, constant-time hex comparison.
function signaturesMatch(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let index = 0; index < a.length; index++) {
        mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
    }
    return mismatch === 0;
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!RAZORPAY_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error('Missing environment variables');
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get the raw body for signature verification
        const body = await req.text();
        const signature = req.headers.get('x-razorpay-signature');

        if (!signature) {
            console.error('Missing Razorpay signature');
            return new Response(
                JSON.stringify({ error: 'Missing signature' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify webhook signature
        const expectedSignature = createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
            .update(body)
            .digest('hex');

        if (!signaturesMatch(signature, expectedSignature)) {
            console.error('Invalid signature');
            return new Response(
                JSON.stringify({ error: 'Invalid signature' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse the webhook payload
        const payload = JSON.parse(body);
        console.log('Razorpay webhook received:', payload.event);

        // Initialize Supabase client with service role
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Handle different event types
        switch (payload.event) {
            case 'payment.captured':
            case 'payment_link.paid': {
                const paymentEntity = payload.payload?.payment?.entity || payload.payload?.payment_link?.entity;

                if (!paymentEntity) {
                    console.error('No payment entity in payload');
                    break;
                }

                const paymentId = paymentEntity.id;
                const orderId = paymentEntity.order_id || null;
                const paidPaise = Number(paymentEntity.amount);
                const amount = paidPaise / 100; // Convert from paise to rupees
                const email = paymentEntity.email || paymentEntity.customer?.email || null;

                console.log(`Payment received: ${paymentId}, order: ${orderId}, amount: ${amount}`);

                // IDEMPOTENCY: Razorpay retries deliveries, so a payment that has
                // already been recorded must not extend the subscription again.
                const { data: existingPayment } = await supabase
                    .from('subscription_payments')
                    .select('id, payment_status')
                    .eq('razorpay_payment_id', paymentId)
                    .maybeSingle();

                if (existingPayment?.payment_status === 'success') {
                    console.log(`Payment ${paymentId} already processed. Ignoring duplicate delivery.`);
                    break;
                }

                // Locate the order this payment belongs to. This row is created by
                // create-razorpay-order and carries the server-side price, so it is
                // the only trustworthy statement of what the user owes.
                let orderRecord: { id: string; user_id: string; amount: number; plan_id: string | null } | null = null;
                if (orderId) {
                    const { data } = await supabase
                        .from('subscription_payments')
                        .select('id, user_id, amount, plan_id')
                        .eq('razorpay_order_id', orderId)
                        .maybeSingle();
                    orderRecord = data as typeof orderRecord;
                }

                // SECURITY: identify the buyer from the order notes we set ourselves,
                // then from our own order row. The checkout email is controlled by
                // whoever pays, so matching on it allowed upgrading someone else's
                // account by paying with their email address.
                let userId: string | null = paymentEntity.notes?.user_id || orderRecord?.user_id || null;

                if (!userId && email) {
                    console.warn(`No user_id in notes or order record for payment ${paymentId}. Falling back to email lookup.`);
                    const { data: profiles, error: findError } = await supabase
                        .from('profiles')
                        .select('id, email')
                        .eq('email', email)
                        .limit(2);

                    if (findError) {
                        console.error('Profile lookup failed for', email, findError);
                    } else if (!profiles || profiles.length === 0) {
                        console.error('User not found for email:', email);
                    } else if (profiles.length > 1) {
                        // .single() used to throw here and abort the whole handler.
                        console.error(`Multiple profiles share the email ${email}. Refusing to guess.`);
                    } else {
                        userId = profiles[0].id;
                    }
                }

                if (!userId) {
                    console.error(`Could not identify a user for payment ${paymentId}. No access granted.`);
                    // Still acknowledge so Razorpay stops retrying.
                    break;
                }

                // SECURITY: verify the amount actually paid covers the order.
                // Previously ANY captured amount granted a full year of access.
                if (orderRecord) {
                    const expectedPaise = Math.round(Number(orderRecord.amount) * 100);
                    if (!Number.isFinite(paidPaise) || paidPaise < expectedPaise) {
                        console.error(
                            `Underpayment for order ${orderId}: paid ${paidPaise} paise, expected ${expectedPaise} paise. No access granted.`
                        );
                        await supabase
                            .from('subscription_payments')
                            .update({
                                razorpay_payment_id: paymentId,
                                payment_status: 'underpaid',
                                description: `Underpaid: received ${amount}, expected ${orderRecord.amount}`,
                            })
                            .eq('id', orderRecord.id);
                        break;
                    }
                } else {
                    // Payment links are created outside this app and have no order row,
                    // so there is nothing to validate the amount against.
                    console.warn(
                        `No order record found for payment ${paymentId} (order ${orderId}). Amount could not be validated against a server-side price.`
                    );
                }

                // Update user's payment status to 'paid'
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        payment_status: 'paid',
                        razorpay_payment_id: paymentId,
                        payment_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
                    })
                    .eq('id', userId);

                if (updateError) {
                    console.error('Failed to update payment status:', updateError);
                } else {
                    console.log(`Successfully updated payment status for user: ${userId}`);
                }

                // Record the payment against the existing order row when we have one,
                // so the pending row is closed out instead of duplicated.
                try {
                    if (orderRecord) {
                        await supabase
                            .from('subscription_payments')
                            .update({
                                razorpay_payment_id: paymentId,
                                payment_status: 'success',
                                completed_at: new Date().toISOString(),
                            })
                            .eq('id', orderRecord.id);
                    } else {
                        await supabase.from('subscription_payments').insert({
                            user_id: userId,
                            amount: amount,
                            currency: 'INR',
                            razorpay_payment_id: paymentId,
                            payment_status: 'success',
                            description: 'Payment via Razorpay Payment Button',
                            completed_at: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    console.error('Could not record payment in subscription_payments:', e);
                }
                break;
            }

            case 'payment.failed': {
                const paymentEntity = payload.payload?.payment?.entity;
                const orderId = paymentEntity?.order_id;

                console.log(`Payment failed for order ${orderId}`);

                if (orderId) {
                    await supabase
                        .from('subscription_payments')
                        .update({ payment_status: 'failed' })
                        .eq('razorpay_order_id', orderId);
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${payload.event}`);
        }

        // Always return 200 to acknowledge receipt
        return new Response(
            JSON.stringify({ received: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: unknown) {
        console.error('Webhook error:', error);
        // Still return 200 to prevent Razorpay from retrying
        return new Response(
            JSON.stringify({ received: true, error: 'Processing error' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
