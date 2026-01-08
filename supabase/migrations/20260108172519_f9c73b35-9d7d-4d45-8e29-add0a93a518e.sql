-- 1. Fix enterprise plan data
UPDATE subscription_plans 
SET max_telegram_channels = 999 
WHERE name = 'enterprise' AND max_telegram_channels IS NULL;

-- 2. Add telegram_bot_token column (if not exists)
ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT;