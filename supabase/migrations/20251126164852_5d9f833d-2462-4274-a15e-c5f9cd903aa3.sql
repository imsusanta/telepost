-- Add status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add check constraint for status values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_status_check'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_status_check 
    CHECK (status IN ('active', 'suspended', 'banned'));
  END IF;
END $$;

-- Assign super_admin role to susantalohr@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM public.profiles
WHERE email = 'susantalohr@gmail.com'
ON CONFLICT DO NOTHING;

-- Create RLS policy for super admins to view all profiles
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Create RLS policy for super admins to update all profiles
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
CREATE POLICY "Super admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.is_super_admin(auth.uid()));

-- Create RLS policies for super admins to manage user_roles
DROP POLICY IF EXISTS "Super admins can view all user roles" ON public.user_roles;
CREATE POLICY "Super admins can view all user roles"
ON public.user_roles FOR SELECT
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can insert user roles" ON public.user_roles;
CREATE POLICY "Super admins can insert user roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can update user roles" ON public.user_roles;
CREATE POLICY "Super admins can update user roles"
ON public.user_roles FOR UPDATE
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can delete user roles" ON public.user_roles;
CREATE POLICY "Super admins can delete user roles"
ON public.user_roles FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- Create RLS policy for super admins to view all subscriptions
DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Super admins can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Create RLS policy for super admins to view all usage tracking
DROP POLICY IF EXISTS "Super admins can view all usage tracking" ON public.usage_tracking;
CREATE POLICY "Super admins can view all usage tracking"
ON public.usage_tracking FOR SELECT
USING (public.is_super_admin(auth.uid()));