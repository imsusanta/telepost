-- =============================================
-- SUPER ADMIN ROLES & PERMISSIONS
-- =============================================
-- This migration adds role-based access control with super admin capabilities

-- Add role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
CHECK (role IN ('user', 'admin', 'super_admin'));

-- Add can_purchase_plans flag to control who can buy subscriptions
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS can_purchase_plans BOOLEAN NOT NULL DEFAULT true;

-- Add index for role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =============================================
-- ADMIN ACCESS RLS POLICIES
-- =============================================

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or super admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SUPER ADMIN POLICIES FOR PROFILES TABLE
-- =============================================

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING (
  is_super_admin(auth.uid()) OR auth.uid() = id
);

-- Super admins can update all profiles (to manage roles and permissions)
CREATE POLICY "Super admins can update all profiles"
ON public.profiles FOR UPDATE
USING (
  is_super_admin(auth.uid()) OR auth.uid() = id
);

-- =============================================
-- SUPER ADMIN POLICIES FOR SUBSCRIPTIONS
-- =============================================

-- Super admins can view all subscriptions
CREATE POLICY "Super admins can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (
  is_super_admin(auth.uid()) OR auth.uid() = user_id
);

-- Super admins can update all subscriptions
CREATE POLICY "Super admins can update all subscriptions"
ON public.subscriptions FOR UPDATE
USING (
  is_super_admin(auth.uid()) OR auth.uid() = user_id
);

-- Super admins can delete subscriptions
CREATE POLICY "Super admins can delete subscriptions"
ON public.subscriptions FOR DELETE
USING (
  is_super_admin(auth.uid())
);

-- =============================================
-- SUPER ADMIN POLICIES FOR USAGE TRACKING
-- =============================================

-- Super admins can view all usage tracking
CREATE POLICY "Super admins can view all usage tracking"
ON public.usage_tracking FOR SELECT
USING (
  is_super_admin(auth.uid()) OR auth.uid() = user_id
);

-- =============================================
-- SUPER ADMIN POLICIES FOR OTHER TABLES
-- =============================================

-- Admins can view all channels
CREATE POLICY "Admins can view all channels"
ON public.channels FOR SELECT
USING (
  is_admin(auth.uid()) OR auth.uid() = user_id
);

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON public.documents FOR SELECT
USING (
  is_admin(auth.uid()) OR auth.uid() = user_id
);

-- Admins can view all quiz generations
CREATE POLICY "Admins can view all quiz generations"
ON public.quiz_generations FOR SELECT
USING (
  is_admin(auth.uid()) OR auth.uid() = user_id
);

-- Admins can view all question banks
CREATE POLICY "Admins can view all question_banks"
ON public.question_banks FOR SELECT
USING (
  is_admin(auth.uid()) OR auth.uid() = user_id OR is_public = true
);

-- =============================================
-- ADMIN ACTIVITY LOG TABLE
-- =============================================

-- Create admin activity log to track admin actions
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'update_role', 'toggle_purchase_permission', 'view_user', etc.
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_activity_admin_id ON public.admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_target_user ON public.admin_activity_log(target_user_id);
CREATE INDEX idx_admin_activity_created_at ON public.admin_activity_log(created_at DESC);

-- Enable RLS for admin activity log
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity log
CREATE POLICY "Admins can view activity log"
ON public.admin_activity_log FOR SELECT
USING (is_admin(auth.uid()));

-- Only admins can insert activity log
CREATE POLICY "Admins can insert activity log"
ON public.admin_activity_log FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- HELPER FUNCTIONS FOR ADMIN OPERATIONS
-- =============================================

-- Function to update user role (admin only)
CREATE OR REPLACE FUNCTION admin_update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can update user roles';
  END IF;

  -- Validate role
  IF new_role NOT IN ('user', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  -- Update role
  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;

  -- Log activity
  INSERT INTO public.admin_activity_log (admin_id, action, target_user_id, details)
  VALUES (
    auth.uid(),
    'update_role',
    target_user_id,
    jsonb_build_object('new_role', new_role)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle purchase permission (super admin only)
CREATE OR REPLACE FUNCTION admin_toggle_purchase_permission(
  target_user_id UUID,
  can_purchase BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can toggle purchase permissions';
  END IF;

  -- Update permission
  UPDATE public.profiles
  SET can_purchase_plans = can_purchase
  WHERE id = target_user_id;

  -- Log activity
  INSERT INTO public.admin_activity_log (admin_id, action, target_user_id, details)
  VALUES (
    auth.uid(),
    'toggle_purchase_permission',
    target_user_id,
    jsonb_build_object('can_purchase_plans', can_purchase)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN public.profiles.role IS 'User role: user, admin, or super_admin';
COMMENT ON COLUMN public.profiles.can_purchase_plans IS 'Whether user is allowed to purchase subscription plans';
COMMENT ON FUNCTION is_super_admin IS 'Check if user has super_admin role';
COMMENT ON FUNCTION is_admin IS 'Check if user has admin or super_admin role';
COMMENT ON FUNCTION admin_update_user_role IS 'Super admin function to update user roles';
COMMENT ON FUNCTION admin_toggle_purchase_permission IS 'Super admin function to control purchase permissions';
COMMENT ON TABLE public.admin_activity_log IS 'Audit log for admin actions';
