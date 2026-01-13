-- =============================================
-- FEATURE MANAGEMENT & USER APPROVAL SYSTEM
-- =============================================
-- This migration adds:
-- 1. System Features table for global feature toggles
-- 2. approval_status field to profiles for user approval workflow
-- 3. Feature flags on subscription_plans for plan-based features
-- =============================================

-- ============================================
-- 1. SYSTEM FEATURES TABLE (Global Toggles)
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,  -- 'telegram_quiz', 'lms_attendance'
  display_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_core_feature BOOLEAN NOT NULL DEFAULT false, -- Core features cannot be disabled
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_features
DROP POLICY IF EXISTS "Anyone can view system features" ON public.system_features;
CREATE POLICY "Anyone can view system features"
ON public.system_features FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only super admins can update system features" ON public.system_features;
CREATE POLICY "Only super admins can update system features"
ON public.system_features FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Only super admins can insert system features" ON public.system_features;
CREATE POLICY "Only super admins can insert system features"
ON public.system_features FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Seed default system features
INSERT INTO public.system_features (feature_key, display_name, description, is_enabled, is_core_feature)
VALUES
  ('telegram_quiz', 'Telegram Quiz', 'Core quiz generation and Telegram posting feature', true, true),
  ('lms_attendance', 'Learning Management & Attendance', 'Student management, batches, attendance tracking, and leave requests', true, false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================
-- 2. ADD APPROVAL STATUS TO PROFILES
-- ============================================

-- Add approval_status column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending';

-- Add approved_at timestamp
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add approved_by reference
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add rejection_reason for rejected users
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index on approval_status for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles(approval_status);

-- ============================================
-- 3. ADD FEATURE FLAGS TO SUBSCRIPTION PLANS
-- ============================================

-- Add new feature columns to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS has_telegram_quiz BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS has_lms_attendance BOOLEAN NOT NULL DEFAULT false;

-- Add plan_order for sorting (higher order = higher tier)
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS plan_order INTEGER NOT NULL DEFAULT 0;

-- Update existing plans with feature flags and order
UPDATE public.subscription_plans SET 
  has_telegram_quiz = true,
  has_lms_attendance = false,
  plan_order = 1
WHERE name = 'starter';

UPDATE public.subscription_plans SET 
  has_telegram_quiz = true,
  has_lms_attendance = true,
  plan_order = 2
WHERE name = 'pro';

UPDATE public.subscription_plans SET 
  has_telegram_quiz = true,
  has_lms_attendance = true,
  plan_order = 3
WHERE name = 'agency';

UPDATE public.subscription_plans SET 
  has_telegram_quiz = true,
  has_lms_attendance = true,
  plan_order = 4
WHERE name = 'enterprise';

-- ============================================
-- 4. UPDATED_AT TRIGGER FOR SYSTEM_FEATURES
-- ============================================

DROP TRIGGER IF EXISTS update_system_features_updated_at ON public.system_features;
CREATE TRIGGER update_system_features_updated_at 
BEFORE UPDATE ON public.system_features
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. RLS POLICY FOR SUPER ADMIN TO VIEW ALL PROFILES
-- ============================================

-- Allow super admins to view all profiles (for user approval)
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'super_admin'
  )
);

-- Allow super admins to update approval status
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
CREATE POLICY "Super admins can update all profiles"
ON public.profiles FOR UPDATE
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'super_admin'
  )
);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
