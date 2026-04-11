-- Migration: New Subscription Tiers (Free, Basic, Pro)
-- Date: 2026-03-09

-- 1. Add new feature flags to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS has_story BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS has_ai_writing BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS quiz_manual_only BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS question_bank_private_only BOOLEAN NOT NULL DEFAULT true;

-- 2. Deactivate existing plans if they are not our new ones
UPDATE public.subscription_plans 
SET is_active = false 
WHERE name NOT IN ('free', 'basic', 'pro');

-- 3. Upsert New Plans
-- Free Plan (Trial)
INSERT INTO public.subscription_plans (name, display_name, price, billing_period, max_telegram_channels, max_pdf_storage_gb, has_story, has_ai_writing, quiz_manual_only, question_bank_private_only, has_auto_scheduling, is_active)
VALUES ('free', 'Free Trial', 0.00, 'monthly', 1, 2, true, false, true, true, true, true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price = EXCLUDED.price,
  max_telegram_channels = EXCLUDED.max_telegram_channels,
  max_pdf_storage_gb = EXCLUDED.max_pdf_storage_gb,
  has_story = EXCLUDED.has_story,
  has_ai_writing = EXCLUDED.has_ai_writing,
  quiz_manual_only = EXCLUDED.quiz_manual_only,
  question_bank_private_only = EXCLUDED.question_bank_private_only,
  has_auto_scheduling = EXCLUDED.has_auto_scheduling,
  is_active = true;

-- Basic Plan
INSERT INTO public.subscription_plans (name, display_name, price, billing_period, max_telegram_channels, max_pdf_storage_gb, has_story, has_ai_writing, quiz_manual_only, question_bank_private_only, has_auto_scheduling, is_active)
VALUES ('basic', 'Basic', 29.00, 'monthly', 5, 10, true, false, true, true, true, true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price = EXCLUDED.price,
  max_telegram_channels = EXCLUDED.max_telegram_channels,
  max_pdf_storage_gb = EXCLUDED.max_pdf_storage_gb,
  has_story = EXCLUDED.has_story,
  has_ai_writing = EXCLUDED.has_ai_writing,
  quiz_manual_only = EXCLUDED.quiz_manual_only,
  question_bank_private_only = EXCLUDED.question_bank_private_only,
  has_auto_scheduling = EXCLUDED.has_auto_scheduling,
  is_active = true;

-- Pro Plan
INSERT INTO public.subscription_plans (name, display_name, price, billing_period, max_telegram_channels, max_pdf_storage_gb, has_story, has_ai_writing, quiz_manual_only, question_bank_private_only, has_auto_scheduling, is_active)
VALUES ('pro', 'Pro', 99.00, 'monthly', 100, 100, true, true, false, false, true, true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price = EXCLUDED.price,
  max_telegram_channels = EXCLUDED.max_telegram_channels,
  max_pdf_storage_gb = EXCLUDED.max_pdf_storage_gb,
  has_story = EXCLUDED.has_story,
  has_ai_writing = EXCLUDED.has_ai_writing,
  quiz_manual_only = EXCLUDED.quiz_manual_only,
  question_bank_private_only = EXCLUDED.question_bank_private_only,
  has_auto_scheduling = EXCLUDED.has_auto_scheduling,
  is_active = true;

-- 4. Update handle_new_user function to handle 7-day trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  -- 1. Create user profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  -- 2. Get the free plan ID
  SELECT id INTO v_free_plan_id
  FROM public.subscription_plans
  WHERE name = 'free' AND is_active = true
  LIMIT 1;

  -- 3. Create subscription with 7-day trial
  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      user_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end
    )
    VALUES (
      NEW.id,
      v_free_plan_id,
      'active',
      now(),
      now() + INTERVAL '7 days', -- 7-day trial
      false
    );

    -- 4. Initialize usage tracking
    INSERT INTO public.usage_tracking (
      user_id,
      quizzes_generated_this_month,
      pdfs_uploaded_this_month,
      total_quizzes_generated,
      total_pdfs_uploaded,
      total_storage_used_bytes,
      current_period_start,
      last_reset_at
    )
    VALUES (
      NEW.id,
      0, 0, 0, 0, 0,
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;
