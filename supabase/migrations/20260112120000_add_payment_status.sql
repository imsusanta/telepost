-- Add payment_status column with default 'paid' so existing users have full access
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';

-- Add other payment columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_requested_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Make sure all existing users have 'paid' status (full access)
UPDATE public.profiles SET payment_status = 'paid' WHERE payment_status IS NULL;
