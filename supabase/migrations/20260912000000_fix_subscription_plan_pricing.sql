-- Align public pricing, checkout amounts, and plan limits.
-- Basic is the entry paid tier; Pro is the higher-capacity tier.

UPDATE public.subscription_plans
SET
  display_name = 'Basic',
  price = 199,
  yearly_price = 1999,
  billing_period = 'monthly',
  max_telegram_channels = 5,
  max_quizzes_per_month = 1000,
  max_question_bank_size = 5000,
  is_popular = false,
  is_active = true,
  updated_at = now()
WHERE name = 'basic';

UPDATE public.subscription_plans
SET
  display_name = 'Pro',
  price = 299,
  yearly_price = 2999,
  billing_period = 'monthly',
  max_telegram_channels = 100,
  max_quizzes_per_month = 1000000,
  max_question_bank_size = 1000000,
  is_popular = true,
  is_active = true,
  updated_at = now()
WHERE name = 'pro';