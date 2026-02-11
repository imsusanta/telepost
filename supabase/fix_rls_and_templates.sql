-- =============================================
-- DATABASE SCHEMA & RLS FIX
-- =============================================

-- 1. Ensure the role column exists in profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));
    END IF;
END $$;

-- 2. Create a security definer function to check admin status safely
-- This function skips RLS and avoids infinite recursion
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'super_admin' OR role = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix Infinite Recursion in Profiles RLS
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "Super admins can update all profiles"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_super_admin());

-- 4. Re-setup User Templates Table & Policies
DROP TABLE IF EXISTS public.user_templates CASCADE;

CREATE TABLE public.user_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.user_templates ENABLE ROW LEVEL SECURITY;

-- Policies for user_templates
CREATE POLICY "Users can view own and default templates"
    ON public.user_templates FOR SELECT
    USING (user_id = auth.uid() OR is_default = true OR public.is_super_admin());

CREATE POLICY "Users can insert own templates"
    ON public.user_templates FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_default = false);

CREATE POLICY "Users can update own templates"
    ON public.user_templates FOR UPDATE
    USING (user_id = auth.uid() AND is_default = false);

CREATE POLICY "Users can delete own templates"
    ON public.user_templates FOR DELETE
    USING (user_id = auth.uid() AND is_default = false);

CREATE POLICY "Super admins can manage all templates"
    ON public.user_templates FOR ALL
    USING (public.is_super_admin());

-- Seed default templates
INSERT INTO public.user_templates (name, subject, description, prompt, is_default)
VALUES 
('Comprehensive Quiz', 'General', 'Standard balanced quiz with mixed difficulties', 'You are a quiz generator. Create a balanced quiz with a mix of easy, medium, and hard questions.', true),
('Conceptual Physics', 'Physics', 'Deep conceptual testing for physics topics', 'You are a physics expert. Generate questions that test deep conceptual understanding of physics laws.', true)
ON CONFLICT (user_id, name) DO NOTHING;
