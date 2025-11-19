-- =============================================
-- FIX BILLING DATABASE SCHEMA
-- =============================================
-- This migration fixes the subscription_plans table to match
-- the expected schema in the application code
-- =============================================

-- ============================================
-- 1. DROP AND RECREATE SUBSCRIPTION_PLANS
-- ============================================

-- Drop existing table and recreate with correct schema
DROP TABLE IF EXISTS public.subscription_plans CASCADE;

CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'starter', 'pro', 'agency', 'enterprise'
  display_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'

  -- Feature limits
  max_telegram_channels INTEGER NOT NULL DEFAULT 1,
  max_pdf_storage_gb INTEGER NOT NULL DEFAULT 10,
  max_quizzes_per_month INTEGER, -- NULL = unlimited
  max_batch_quiz_generation INTEGER NOT NULL DEFAULT 1,
  max_question_bank_size INTEGER NOT NULL DEFAULT 10000,

  -- Feature flags
  has_advanced_ai BOOLEAN NOT NULL DEFAULT false,
  has_auto_scheduling BOOLEAN NOT NULL DEFAULT false,
  has_auto_pdf_explanations BOOLEAN NOT NULL DEFAULT false,
  has_analytics_dashboard BOOLEAN NOT NULL DEFAULT false,
  has_leaderboards BOOLEAN NOT NULL DEFAULT false,
  has_custom_branding BOOLEAN NOT NULL DEFAULT false,
  has_multi_language BOOLEAN NOT NULL DEFAULT false,
  has_priority_support BOOLEAN NOT NULL DEFAULT false,
  has_api_access BOOLEAN NOT NULL DEFAULT false,
  has_white_label BOOLEAN NOT NULL DEFAULT false,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 2. RECREATE SUBSCRIPTIONS TABLE
-- ============================================

-- Recreate subscriptions table with proper foreign key
DROP TABLE IF EXISTS public.subscriptions CASCADE;

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),

  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'expired', 'past_due'
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,

  -- Payment info (for future Stripe/Razorpay integration)
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(user_id) -- One active subscription per user
);

-- ============================================
-- 3. ENSURE USAGE_TRACKING TABLE EXISTS
-- ============================================

-- Drop and recreate to ensure correct schema
DROP TABLE IF EXISTS public.usage_tracking CASCADE;

CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Monthly counters (reset at billing period)
  quizzes_generated_this_month INTEGER NOT NULL DEFAULT 0,
  pdfs_uploaded_this_month INTEGER NOT NULL DEFAULT 0,

  -- Total usage
  total_quizzes_generated INTEGER NOT NULL DEFAULT 0,
  total_pdfs_uploaded INTEGER NOT NULL DEFAULT 0,
  total_storage_used_bytes BIGINT NOT NULL DEFAULT 0,

  -- Tracking
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(user_id)
);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES
-- ============================================

-- Subscription Plans (public read)
CREATE POLICY "Anyone can view subscription plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- Subscriptions (user can view/update their own)
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- Usage Tracking
CREATE POLICY "Users can view their own usage"
ON public.usage_tracking FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
ON public.usage_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
ON public.usage_tracking FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- 6. CREATE TRIGGERS
-- ============================================

-- Function to update updated_at timestamp (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at
BEFORE UPDATE ON public.usage_tracking
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. SEED DEFAULT SUBSCRIPTION PLANS
-- ============================================

INSERT INTO public.subscription_plans (
  name,
  display_name,
  price,
  billing_period,
  max_telegram_channels,
  max_pdf_storage_gb,
  max_quizzes_per_month,
  max_batch_quiz_generation,
  max_question_bank_size,
  has_advanced_ai,
  has_auto_scheduling,
  has_auto_pdf_explanations,
  has_analytics_dashboard,
  has_leaderboards,
  has_custom_branding,
  has_multi_language,
  has_priority_support,
  has_api_access,
  has_white_label
)
VALUES
  -- Free Plan
  ('free', 'Free', 0.00, 'monthly', 1, 1, 10, 1, 100, false, false, false, false, false, false, false, false, false, false),
  -- Starter Plan
  ('starter', 'Starter', 29.00, 'monthly', 1, 10, 50, 1, 10000, false, false, false, false, false, false, false, false, false, false),
  -- Pro Plan
  ('pro', 'Pro', 99.00, 'monthly', 3, 50, NULL, 30, 50000, true, true, true, true, true, true, true, true, false, false),
  -- Agency Plan
  ('agency', 'Agency', 249.00, 'monthly', 10, 200, NULL, 100, 200000, true, true, true, true, true, true, true, true, true, true),
  -- Enterprise Plan
  ('enterprise', 'Enterprise', 999.00, 'monthly', NULL, 1000, NULL, 1000, 1000000, true, true, true, true, true, true, true, true, true, true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price = EXCLUDED.price,
  billing_period = EXCLUDED.billing_period,
  max_telegram_channels = EXCLUDED.max_telegram_channels,
  max_pdf_storage_gb = EXCLUDED.max_pdf_storage_gb,
  max_quizzes_per_month = EXCLUDED.max_quizzes_per_month,
  max_batch_quiz_generation = EXCLUDED.max_batch_quiz_generation,
  max_question_bank_size = EXCLUDED.max_question_bank_size,
  has_advanced_ai = EXCLUDED.has_advanced_ai,
  has_auto_scheduling = EXCLUDED.has_auto_scheduling,
  has_auto_pdf_explanations = EXCLUDED.has_auto_pdf_explanations,
  has_analytics_dashboard = EXCLUDED.has_analytics_dashboard,
  has_leaderboards = EXCLUDED.has_leaderboards,
  has_custom_branding = EXCLUDED.has_custom_branding,
  has_multi_language = EXCLUDED.has_multi_language,
  has_priority_support = EXCLUDED.has_priority_support,
  has_api_access = EXCLUDED.has_api_access,
  has_white_label = EXCLUDED.has_white_label,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 8. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to get user's subscription plan
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TABLE (
  plan_name TEXT,
  plan_features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.name,
    jsonb_build_object(
      'max_telegram_channels', sp.max_telegram_channels,
      'max_pdf_storage_gb', sp.max_pdf_storage_gb,
      'max_quizzes_per_month', sp.max_quizzes_per_month,
      'max_batch_quiz_generation', sp.max_batch_quiz_generation,
      'max_question_bank_size', sp.max_question_bank_size,
      'has_advanced_ai', sp.has_advanced_ai,
      'has_auto_scheduling', sp.has_auto_scheduling,
      'has_auto_pdf_explanations', sp.has_auto_pdf_explanations,
      'has_analytics_dashboard', sp.has_analytics_dashboard,
      'has_leaderboards', sp.has_leaderboards,
      'has_custom_branding', sp.has_custom_branding,
      'has_multi_language', sp.has_multi_language,
      'has_priority_support', sp.has_priority_support,
      'has_api_access', sp.has_api_access,
      'has_white_label', sp.has_white_label
    )
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = p_user_id AND s.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment quiz count
CREATE OR REPLACE FUNCTION increment_quiz_count(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.usage_tracking
  SET
    quizzes_generated_this_month = quizzes_generated_this_month + 1,
    total_quizzes_generated = total_quizzes_generated + 1,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Insert if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO public.usage_tracking (
      user_id,
      quizzes_generated_this_month,
      total_quizzes_generated
    ) VALUES (
      p_user_id,
      1,
      1
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMPLETED SUCCESSFULLY
-- ============================================

COMMENT ON TABLE public.subscription_plans IS 'Subscription plans with pricing and feature flags';
COMMENT ON TABLE public.subscriptions IS 'User subscriptions to plans';
COMMENT ON TABLE public.usage_tracking IS 'Track user usage statistics for quota enforcement';
