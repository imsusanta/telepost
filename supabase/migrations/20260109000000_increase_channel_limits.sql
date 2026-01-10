-- Update starter plan to 5 channels
UPDATE public.subscription_plans 
SET max_telegram_channels = 5 
WHERE name = 'starter';

-- Update pro plan to 10 channels (since starter is now 5)
UPDATE public.subscription_plans 
SET max_telegram_channels = 10 
WHERE name = 'pro';
