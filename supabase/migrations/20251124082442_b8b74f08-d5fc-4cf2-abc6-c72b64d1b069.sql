-- Fix profiles table - add missing columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_purchase_plans boolean DEFAULT true;

-- Drop and recreate usage_tracking with correct schema
DROP TABLE IF EXISTS usage_tracking CASCADE;

CREATE TABLE usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quizzes_generated_this_month integer NOT NULL DEFAULT 0,
  pdfs_uploaded_this_month integer NOT NULL DEFAULT 0,
  total_quizzes_generated integer NOT NULL DEFAULT 0,
  total_pdfs_uploaded integer NOT NULL DEFAULT 0,
  total_storage_used_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage" ON usage_tracking
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update usage" ON usage_tracking
  FOR UPDATE USING (true);

-- Drop and recreate subscription_plans with correct schema
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

CREATE TABLE subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  price numeric NOT NULL,
  billing_period text NOT NULL DEFAULT 'monthly',
  
  -- Limits
  max_telegram_channels integer NOT NULL,
  max_pdf_storage_gb integer NOT NULL DEFAULT 10,
  max_quizzes_per_month integer,
  max_batch_quiz_generation integer NOT NULL DEFAULT 1,
  max_question_bank_size integer NOT NULL DEFAULT 10000,
  
  -- Features
  has_advanced_ai boolean NOT NULL DEFAULT false,
  has_auto_scheduling boolean NOT NULL DEFAULT false,
  has_auto_pdf_explanations boolean NOT NULL DEFAULT false,
  has_analytics_dashboard boolean NOT NULL DEFAULT false,
  has_custom_branding boolean NOT NULL DEFAULT false,
  has_multi_language boolean NOT NULL DEFAULT false,
  has_api_access boolean NOT NULL DEFAULT false,
  has_white_label boolean NOT NULL DEFAULT false,
  
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- Recreate subscriptions table
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  coupon_id uuid REFERENCES coupons(id),
  discount_amount numeric DEFAULT 0,
  original_price numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, status)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update subscriptions" ON subscriptions
  FOR UPDATE USING (true);

-- Insert new pricing plans
INSERT INTO subscription_plans (
  name, display_name, description, price, billing_period,
  max_telegram_channels, max_pdf_storage_gb, max_quizzes_per_month,
  max_batch_quiz_generation, max_question_bank_size,
  has_advanced_ai, has_auto_scheduling, has_auto_pdf_explanations,
  has_analytics_dashboard, has_custom_branding, has_multi_language
) VALUES 
(
  'basic', 'Basic', 'Perfect for getting started',
  5.00, 'monthly',
  1, 10, 50,
  1, 10000,
  false, false, false,
  false, false, false
),
(
  'pro', 'Pro', 'Best for power users',
  10.00, 'monthly',
  999, 50, NULL,
  30, 50000,
  true, true, true,
  true, true, true
),
(
  'enterprise', 'Enterprise', 'For agencies - Contact us',
  0, 'custom',
  999999, 999999, NULL,
  999, 999999,
  true, true, true,
  true, true, true
);

-- Create RPC function for incrementing quiz count
CREATE OR REPLACE FUNCTION increment_quiz_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, quizzes_generated_this_month, total_quizzes_generated)
  VALUES (p_user_id, 1, 1)
  ON CONFLICT (user_id)
  DO UPDATE SET
    quizzes_generated_this_month = usage_tracking.quizzes_generated_this_month + 1,
    total_quizzes_generated = usage_tracking.total_quizzes_generated + 1,
    updated_at = now();
END;
$$;