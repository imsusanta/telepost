-- Migration: User Payment System
-- Adds payment_status, payment tracking to profiles and subscription_payments table

-- Add payment-related columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'locked'));

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_requested_at TIMESTAMPTZ;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ;

-- Create index for payment status queries
CREATE INDEX IF NOT EXISTS idx_profiles_payment_status ON public.profiles(payment_status);

-- Migrate existing approved users to 'paid' status so they're not blocked
UPDATE public.profiles
SET payment_status = 'paid'
WHERE approval_status = 'approved' AND payment_status = 'pending';

-- Create subscription_payments table for payment history
CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded')),
    payment_method TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(razorpay_order_id)
);

-- Create index for user payments
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON public.subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON public.subscription_payments(payment_status);

-- Enable RLS on subscription_payments
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_payments
-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON public.subscription_payments
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own payments (for creating orders)
CREATE POLICY "Users can create own payment records" ON public.subscription_payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role has full access" ON public.subscription_payments
    FOR ALL USING (auth.role() = 'service_role');
