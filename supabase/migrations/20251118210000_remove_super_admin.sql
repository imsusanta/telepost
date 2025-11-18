-- =============================================
-- REMOVE SUPER ADMIN FUNCTIONALITY
-- =============================================
-- This migration removes the super admin role and related functionality
-- Regular admin role will continue to exist for basic administrative tasks

-- Drop the auto-setup super admin trigger and function
DROP TRIGGER IF EXISTS trigger_auto_setup_super_admin ON public.profiles;
DROP FUNCTION IF EXISTS auto_setup_super_admin();

-- Drop super admin-specific RPC functions (keep general admin functions)
-- These functions require super admin privileges
DROP FUNCTION IF EXISTS admin_delete_user(UUID);

-- Drop super admin-specific policies
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can update all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can delete subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can view all usage tracking" ON public.usage_tracking;
DROP POLICY IF EXISTS "Super admins can insert security alerts" ON security_alerts;
DROP POLICY IF EXISTS "Super admins can update security alerts" ON security_alerts;
DROP POLICY IF EXISTS "Super admins can view audit log" ON data_audit_log;

-- Update admin_update_user_role to only require admin (not super admin)
CREATE OR REPLACE FUNCTION admin_update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is admin (changed from super admin)
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;

  -- Validate role (removed super_admin from allowed roles)
  IF new_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %. Allowed roles: user, admin', new_role;
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

-- Update admin_toggle_purchase_permission to only require admin (not super admin)
CREATE OR REPLACE FUNCTION admin_toggle_purchase_permission(
  target_user_id UUID,
  can_purchase BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is admin (changed from super admin)
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can toggle purchase permissions';
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

-- Update admin_suspend_user to only require admin (not super admin)
CREATE OR REPLACE FUNCTION admin_suspend_user(target_user_id UUID, reason TEXT)
RETURNS void AS $$
BEGIN
    -- Check if caller is admin (changed from super admin)
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can suspend users';
    END IF;

    -- Update user status
    UPDATE profiles
    SET status = 'suspended'
    WHERE id = target_user_id;

    -- Log the action
    INSERT INTO admin_activity_log (admin_id, action, target_user_id, details)
    VALUES (
        auth.uid(),
        'suspend_user',
        target_user_id,
        jsonb_build_object('reason', reason, 'timestamp', NOW())
    );

    -- Invalidate all user sessions
    UPDATE session_tracking
    SET is_active = FALSE
    WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update admin_unsuspend_user to only require admin (not super admin)
CREATE OR REPLACE FUNCTION admin_unsuspend_user(target_user_id UUID, reason TEXT)
RETURNS void AS $$
BEGIN
    -- Check if caller is admin (changed from super admin)
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can unsuspend users';
    END IF;

    -- Update user status
    UPDATE profiles
    SET status = 'active'
    WHERE id = target_user_id;

    -- Log the action
    INSERT INTO admin_activity_log (admin_id, action, target_user_id, details)
    VALUES (
        auth.uid(),
        'unsuspend_user',
        target_user_id,
        jsonb_build_object('reason', reason, 'timestamp', NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate admin policies (replacing super admin policies)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (
  is_admin(auth.uid()) OR auth.uid() = id
);

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (
  is_admin(auth.uid()) OR auth.uid() = id
);

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (
  is_admin(auth.uid()) OR auth.uid() = user_id
);

CREATE POLICY "Admins can update all subscriptions"
ON public.subscriptions FOR UPDATE
USING (
  is_admin(auth.uid()) OR auth.uid() = user_id
);

CREATE POLICY "Admins can delete subscriptions"
ON public.subscriptions FOR DELETE
USING (
  is_admin(auth.uid())
);

CREATE POLICY "Admins can view all usage tracking"
ON public.usage_tracking FOR SELECT
USING (
  is_admin(auth.uid()) OR auth.uid() = user_id
);

CREATE POLICY "Admins can insert security alerts"
ON security_alerts FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update security alerts"
ON security_alerts FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view audit log"
ON data_audit_log FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Update role constraint to remove super_admin
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('user', 'admin'));

-- Update any existing super_admin users to admin
UPDATE public.profiles
SET role = 'admin'
WHERE role = 'super_admin';

-- Drop the is_super_admin function (no longer needed)
DROP FUNCTION IF EXISTS is_super_admin(UUID);

-- Update comments
COMMENT ON COLUMN public.profiles.role IS 'User role: user or admin';
COMMENT ON FUNCTION is_admin IS 'Check if user has admin role';
COMMENT ON FUNCTION admin_update_user_role IS 'Admin function to update user roles';
COMMENT ON FUNCTION admin_toggle_purchase_permission IS 'Admin function to control purchase permissions';

-- Log this migration
DO $$
BEGIN
  RAISE NOTICE 'Super admin functionality has been removed. All super_admin users have been converted to admin.';
END $$;
