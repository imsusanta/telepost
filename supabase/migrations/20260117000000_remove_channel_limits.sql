-- Migration to remove Telegram channel limits
-- Created: 2026-01-17

-- 1. Ensure max_telegram_channels column exists on profiles with a high default
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS max_telegram_channels INTEGER DEFAULT 9999;

-- 2. Update all existing subscription plans to have a very high limit
UPDATE public.subscription_plans 
SET max_telegram_channels = 9999;

-- 3. Update all existing users to have a very high limit
UPDATE public.profiles 
SET max_telegram_channels = 9999;

-- 4. Ensure the default for future profiles is also high
ALTER TABLE public.profiles 
ALTER COLUMN max_telegram_channels SET DEFAULT 9999;

-- 5. Add a comment for documentation
COMMENT ON COLUMN public.profiles.max_telegram_channels IS 'Maximum number of Telegram channels the user can add (effectively unlimited)';
