-- Migration: Sync subscription_plans schema for Super Admin dashboard
-- Date: 2026-03-10

-- 1. Add missing columns to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS yearly_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_questions_per_quiz INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS has_write_with_ai BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_documents_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_ai_quiz BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_pdf_quiz BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_ai_post_gen BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_kb_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS kb_view_only BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_kb_docs INTEGER DEFAULT 5;

-- 2. Enable RLS and add policies for Super Admin
-- Note: 'Anyone can view subscription plans' already exists for SELECT

-- Policy for UPDATE: Only super_admin can update plans
CREATE POLICY "Super admins can update subscription plans"
ON public.subscription_plans FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Policy for INSERT: Only super_admin can create plans
CREATE POLICY "Super admins can create subscription plans"
ON public.subscription_plans FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Policy for DELETE: Only super_admin can delete plans
CREATE POLICY "Super admins can delete subscription plans"
ON public.subscription_plans FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- 3. Initial sync for existing plans
-- Set defaults for known plans
UPDATE public.subscription_plans 
SET has_story = true, has_manual_input = true
WHERE name IN ('free', 'basic', 'pro');

-- Basic features
UPDATE public.subscription_plans 
SET has_ai_post_gen = true, has_kb_access = true, has_auto_scheduling = true, has_ai_quiz = true
WHERE name = 'basic';

-- Pro features
UPDATE public.subscription_plans 
SET has_ai_post_gen = true, has_write_with_ai = true, has_kb_access = true, 
    has_auto_scheduling = true, has_ai_quiz = true, has_pdf_quiz = true, 
    has_documents_access = true
WHERE name = 'pro';
