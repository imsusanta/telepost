import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

        if (signature !== expectedSignature) {
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

                const email = paymentEntity.email || paymentEntity.customer?.email;
                const paymentId = paymentEntity.id;
                const amount = paymentEntity.amount / 100; // Convert from paise to rupees

                console.log(`Payment received: ${paymentId} for ${email}, amount: ₹${amount}`);

                if (email) {
                    // Find user by email and update payment status
                    const { data: profile, error: findError } = await supabase
                        .from('profiles')
                        .select('id, email')
                        .eq('email', email)
                        .single();

                    if (findError || !profile) {
                        console.error('User not found for email:', email, findError);
                        // Still return 200 to acknowledge webhook
                        break;
                    }

                    // Update user's payment status to 'paid'
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({
                            payment_status: 'paid',
                            razorpay_payment_id: paymentId,
                            payment_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
                        })
                        .eq('id', profile.id);

                    if (updateError) {
                        console.error('Failed to update payment status:', updateError);
                    } else {
                        console.log(`Successfully updated payment status for user: ${profile.id}`);
                    }

                    // Log the payment (optional - if subscription_payments table exists)
                    try {
                        await supabase.from('subscription_payments').insert({
                            user_id: profile.id,
                            amount: amount,
                            currency: 'INR',
                            razorpay_payment_id: paymentId,
                            payment_status: 'success',
                            description: 'Payment via Razorpay Payment Button',
                            completed_at: new Date().toISOString()
                        });
                    } catch (e) {
                        console.log('Could not log payment to subscription_payments table');
                    }
                }
                break;
            }

            case 'payment.failed': {
                const paymentEntity = payload.payload?.payment?.entity;
                const email = paymentEntity?.email;

                console.log(`Payment failed for ${email}`);
                // Optionally handle failed payments
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
