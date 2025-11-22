-- =============================================
-- INVITATION SYSTEM AND FREE PLAN SETUP
-- =============================================
-- This migration adds:
-- 1. Invitation codes table for SAAS access control
-- 2. Free plan with 1 Telegram channel limit
-- 3. Functions to validate and consume invitation codes
-- =============================================

-- ============================================
-- 1. CREATE INVITATION CODES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for invitation codes
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON public.invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_active ON public.invitation_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_expires_at ON public.invitation_codes(expires_at);

-- ============================================
-- 2. ADD FREE PLAN TO SUBSCRIPTION PLANS
-- ============================================

-- Insert the free plan with 1 Telegram channel limit
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
  has_white_label,
  is_active
)
VALUES (
  'free',
  'Free',
  0.00,
  1,                    -- Single Telegram channel for free users
  5,                    -- 5GB storage
  10,                   -- 10 quizzes per month
  1,                    -- 1 batch quiz generation at a time
  1000,                 -- 1000 questions in question bank
  false,                -- No advanced AI
  false,                -- No auto scheduling
  false,                -- No auto PDF explanations
  false,                -- No analytics dashboard
  false,                -- No leaderboards
  false,                -- No custom branding
  true,                 -- Multi-language support
  false,                -- No priority support
  false,                -- No API access
  false,                -- No white label
  true                  -- Is active
)
ON CONFLICT (name) DO UPDATE SET
  max_telegram_channels = 1,
  max_pdf_storage_gb = 5,
  max_quizzes_per_month = 10,
  max_batch_quiz_generation = 1,
  max_question_bank_size = 1000,
  has_multi_language = true,
  is_active = true;

-- ============================================
-- 3. INVITATION CODE VALIDATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_invitation_code(p_code TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  message TEXT,
  code_id UUID
) AS $$
DECLARE
  v_code_record RECORD;
BEGIN
  -- Get the invitation code record
  SELECT * INTO v_code_record
  FROM public.invitation_codes
  WHERE code = p_code;

  -- Check if code exists
  IF v_code_record.id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid invitation code', NULL::UUID;
    RETURN;
  END IF;

  -- Check if code is active
  IF v_code_record.is_active = false THEN
    RETURN QUERY SELECT false, 'This invitation code has been deactivated', NULL::UUID;
    RETURN;
  END IF;

  -- Check if code has expired
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < now() THEN
    RETURN QUERY SELECT false, 'This invitation code has expired', NULL::UUID;
    RETURN;
  END IF;

  -- Check if code has reached max uses
  IF v_code_record.current_uses >= v_code_record.max_uses THEN
    RETURN QUERY SELECT false, 'This invitation code has been fully used', NULL::UUID;
    RETURN;
  END IF;

  -- Code is valid
  RETURN QUERY SELECT true, 'Valid invitation code', v_code_record.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. CONSUME INVITATION CODE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.consume_invitation_code(p_code TEXT, p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_code_record RECORD;
  v_validation RECORD;
BEGIN
  -- Validate the code first
  SELECT * INTO v_validation
  FROM public.validate_invitation_code(p_code);

  IF v_validation.is_valid = false THEN
    RETURN QUERY SELECT false, v_validation.message;
    RETURN;
  END IF;

  -- Update the invitation code
  UPDATE public.invitation_codes
  SET
    current_uses = current_uses + 1,
    used_by = p_user_id,
    used_at = now(),
    is_active = CASE
      WHEN current_uses + 1 >= max_uses THEN false
      ELSE is_active
    END,
    updated_at = now()
  WHERE code = p_code;

  RETURN QUERY SELECT true, 'Invitation code successfully used';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. GENERATE INVITATION CODE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_invitation_code(
  p_created_by UUID,
  p_max_uses INTEGER DEFAULT 1,
  p_expires_in_days INTEGER DEFAULT 30,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  code TEXT,
  code_id UUID
) AS $$
DECLARE
  v_code TEXT;
  v_code_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin or super admin
  SELECT is_admin(p_created_by) INTO v_is_admin;

  IF v_is_admin = false THEN
    RAISE EXCEPTION 'Only administrators can generate invitation codes';
  END IF;

  -- Generate a unique 12-character code
  v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12));

  -- Insert the invitation code
  INSERT INTO public.invitation_codes (
    code,
    created_by,
    max_uses,
    expires_at,
    metadata
  )
  VALUES (
    v_code,
    p_created_by,
    p_max_uses,
    CASE
      WHEN p_expires_in_days IS NOT NULL THEN now() + (p_expires_in_days || ' days')::INTERVAL
      ELSE NULL
    END,
    p_metadata
  )
  RETURNING invitation_codes.code, invitation_codes.id INTO v_code, v_code_id;

  RETURN QUERY SELECT v_code, v_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. RLS POLICIES FOR INVITATION CODES
-- ============================================

-- Enable RLS
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Admins can view all invitation codes
CREATE POLICY "Admins can view all invitation codes"
ON public.invitation_codes FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can insert invitation codes
CREATE POLICY "Admins can insert invitation codes"
ON public.invitation_codes FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Admins can update invitation codes
CREATE POLICY "Admins can update invitation codes"
ON public.invitation_codes FOR UPDATE
USING (is_admin(auth.uid()));

-- Anyone can validate invitation codes (needed for signup)
-- This is handled through the validate_invitation_code function

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.validate_invitation_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_invitation_code(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invitation_code(UUID, INTEGER, INTEGER, JSONB) TO authenticated;

-- ============================================
-- 8. CREATE ADMIN INVITATION CODES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_invitation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,
  description TEXT,
  codes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_admin_invitation_batches_created_by ON public.admin_invitation_batches(created_by);

-- Enable RLS
ALTER TABLE public.admin_invitation_batches ENABLE ROW LEVEL SECURITY;

-- Admins can view all batches
CREATE POLICY "Admins can view all invitation batches"
ON public.admin_invitation_batches FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can insert batches
CREATE POLICY "Admins can insert invitation batches"
ON public.admin_invitation_batches FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- 9. ADD INVITATION CODE TO PROFILES
-- ============================================

-- Add column to track which invitation code was used
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS invitation_code_used TEXT;

-- Create index
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_code ON public.profiles(invitation_code_used);

-- ============================================
-- 10. SEED INITIAL INVITATION CODES FOR TESTING
-- ============================================

-- Insert a few test invitation codes (only if no codes exist yet)
DO $$
DECLARE
  v_super_admin_id UUID;
  v_count INTEGER;
BEGIN
  -- Get super admin user ID
  SELECT id INTO v_super_admin_id
  FROM public.profiles
  WHERE role = 'super_admin'
  LIMIT 1;

  -- Check if there are any invitation codes
  SELECT COUNT(*) INTO v_count FROM public.invitation_codes;

  -- Only seed if no codes exist and we have a super admin
  IF v_count = 0 AND v_super_admin_id IS NOT NULL THEN
    INSERT INTO public.invitation_codes (code, created_by, max_uses, expires_at, metadata)
    VALUES
      ('WELCOME2024', v_super_admin_id, 100, now() + INTERVAL '90 days', '{"type": "promotional", "campaign": "launch"}'::jsonb),
      ('BETA2024', v_super_admin_id, 50, now() + INTERVAL '60 days', '{"type": "beta", "tier": "early_access"}'::jsonb),
      ('TRIAL2024', v_super_admin_id, 10, now() + INTERVAL '30 days', '{"type": "trial", "tier": "limited"}'::jsonb);
  END IF;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
