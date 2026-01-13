-- =============================================
-- ENSURE SUBSCRIPTIONS TABLE EXISTS
-- =============================================
-- This migration ensures the subscriptions table and related tables exist
-- Can be run multiple times safely (uses IF NOT EXISTS)
-- =============================================

-- ============================================
-- 1. SUBSCRIPTION PLANS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
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
-- 2. SUBSCRIPTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
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
-- 3. USAGE TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.usage_tracking (
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
-- 5. DROP OLD POLICIES (IF THEY EXIST)
-- ============================================

DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can insert their own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update their own usage" ON public.usage_tracking;

-- ============================================
-- 6. CREATE RLS POLICIES
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
-- 7. CREATE OR REPLACE TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old triggers
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON public.usage_tracking;

-- Create triggers
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
-- 8. SEED DEFAULT SUBSCRIPTION PLANS
-- ============================================

INSERT INTO public.subscription_plans (
  name,
  display_name,
  price,
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
  ('starter', 'Starter', 29.00, 1, 10, 50, 1, 10000, false, false, false, false, false, false, false, false, false, false),
  ('pro', 'Pro', 99.00, 3, 50, NULL, 30, 50000, true, true, true, true, true, true, true, true, false, false),
  ('agency', 'Agency', 249.00, 10, 200, NULL, 100, 200000, true, true, true, true, true, true, true, true, true, true),
  ('enterprise', 'Enterprise', 999.00, 999, 1000, NULL, 1000, 1000000, true, true, true, true, true, true, true, true, true, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 9. CREATE HELPER FUNCTION
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

-- ============================================
-- COMPLETED SUCCESSFULLY
-- ============================================
