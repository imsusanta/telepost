-- =============================================
-- REMOVE SUPER ADMIN FEATURES
-- =============================================
-- This migration removes all super admin functionality and cleans up the database

-- =============================================
-- 1. DROP SUPER ADMIN FUNCTIONS
-- =============================================

-- Drop admin management functions
DROP FUNCTION IF EXISTS admin_suspend_user(UUID, TEXT);
DROP FUNCTION IF EXISTS admin_unsuspend_user(UUID, TEXT);
DROP FUNCTION IF EXISTS admin_update_user_role(UUID, TEXT);
DROP FUNCTION IF EXISTS admin_toggle_purchase_permission(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS is_user_suspended(UUID);
DROP FUNCTION IF EXISTS is_super_admin(UUID);
DROP FUNCTION IF EXISTS is_admin(UUID);
DROP FUNCTION IF EXISTS auto_setup_super_admin();
DROP FUNCTION IF EXISTS update_last_login();

-- Drop cleanup functions
DROP FUNCTION IF EXISTS cleanup_old_login_attempts();
DROP FUNCTION IF EXISTS invalidate_old_sessions();

-- =============================================
-- 2. DROP SUPER ADMIN POLICIES
-- =============================================

-- Drop profiles policies
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Suspended users cannot access their data" ON public.profiles;

-- Drop subscriptions policies
DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can update all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can delete subscriptions" ON public.subscriptions;

-- Drop usage tracking policies
DROP POLICY IF EXISTS "Super admins can view all usage tracking" ON public.usage_tracking;

-- Drop admin policies on other tables
DROP POLICY IF EXISTS "Admins can view all channels" ON public.channels;
DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can view all quiz generations" ON public.quiz_generations;
DROP POLICY IF EXISTS "Admins can view all question_banks" ON public.question_banks;

-- Drop security table policies
DROP POLICY IF EXISTS "Admins can view security alerts" ON public.security_alerts;
DROP POLICY IF EXISTS "Super admins can insert security alerts" ON public.security_alerts;
DROP POLICY IF EXISTS "Super admins can update security alerts" ON public.security_alerts;
DROP POLICY IF EXISTS "Admins can view login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.session_tracking;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.session_tracking;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.session_tracking;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.session_tracking;
DROP POLICY IF EXISTS "Admins can view activity log" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Admins can insert activity log" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Super admins can view audit log" ON public.data_audit_log;

-- =============================================
-- 3. DROP SUPER ADMIN TABLES
-- =============================================

-- Drop security and admin tables
DROP TABLE IF EXISTS public.data_audit_log CASCADE;
DROP TABLE IF EXISTS public.session_tracking CASCADE;
DROP TABLE IF EXISTS public.login_attempts CASCADE;
DROP TABLE IF EXISTS public.security_alerts CASCADE;
DROP TABLE IF EXISTS public.admin_activity_log CASCADE;

-- =============================================
-- 4. DROP CRON JOBS
-- =============================================

-- Drop security cleanup cron job if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-security-data') THEN
        PERFORM cron.unschedule('cleanup-security-data');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- pg_cron might not be available, ignore error
        NULL;
END $$;

-- =============================================
-- 5. REMOVE SUPER ADMIN COLUMNS FROM PROFILES
-- =============================================

-- Remove role column (keep only user/admin)
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS role CASCADE;

-- Remove admin-related columns
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS can_purchase_plans CASCADE;

-- Remove security tracking columns
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS status CASCADE;

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS last_login CASCADE;

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS login_count CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_profiles_role;

-- =============================================
-- 6. REMOVE ADMIN-RELATED COLUMNS FROM ADMIN_ACTIVITY_LOG
-- =============================================

-- The table is already dropped above, but just in case
-- DROP TABLE IF EXISTS public.admin_activity_log CASCADE;

-- =============================================
-- 7. RECREATE BASIC POLICIES FOR PROFILES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- =============================================
-- 8. ENSURE SUBSCRIPTIONS TABLE EXISTS AND HAS PROPER POLICIES
-- =============================================

-- Recreate basic subscription policies (removing super admin ones)
-- These are user-only policies

-- Users can view their own subscription
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'subscriptions'
        AND policyname = 'Users can view their own subscription'
    ) THEN
        CREATE POLICY "Users can view their own subscription"
        ON public.subscriptions FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Users can insert their own subscription
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'subscriptions'
        AND policyname = 'Users can insert their own subscription'
    ) THEN
        CREATE POLICY "Users can insert their own subscription"
        ON public.subscriptions FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Users can update their own subscription
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'subscriptions'
        AND policyname = 'Users can update their own subscription'
    ) THEN
        CREATE POLICY "Users can update their own subscription"
        ON public.subscriptions FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- =============================================
-- 9. COMMENTS
-- =============================================

COMMENT ON TABLE public.subscriptions IS 'User subscription management - tracks active subscriptions for each user';
COMMENT ON TABLE public.subscription_plans IS 'Available subscription plans with features and pricing';

-- =============================================
-- COMPLETED SUCCESSFULLY
-- =============================================
