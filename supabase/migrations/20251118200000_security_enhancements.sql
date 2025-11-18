-- Security Enhancements Migration
-- Adds additional security features and audit trails

-- Add security-related columns to admin_activity_log if not exists
DO $$
BEGIN
    -- Add IP address tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'admin_activity_log' AND column_name = 'ip_address') THEN
        ALTER TABLE admin_activity_log ADD COLUMN ip_address TEXT;
    END IF;

    -- Add user agent tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'admin_activity_log' AND column_name = 'user_agent') THEN
        ALTER TABLE admin_activity_log ADD COLUMN user_agent TEXT;
    END IF;

    -- Add session ID for tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'admin_activity_log' AND column_name = 'session_id') THEN
        ALTER TABLE admin_activity_log ADD COLUMN session_id TEXT;
    END IF;
END $$;

-- Create security_alerts table for tracking security incidents
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::jsonb,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on security alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

-- Enable RLS on security_alerts
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can view security alerts
CREATE POLICY "Admins can view security alerts"
    ON security_alerts FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));

-- Only super admins can insert security alerts
CREATE POLICY "Super admins can insert security alerts"
    ON security_alerts FOR INSERT
    TO authenticated
    WITH CHECK (is_super_admin(auth.uid()));

-- Only super admins can update security alerts
CREATE POLICY "Super admins can update security alerts"
    ON security_alerts FOR UPDATE
    TO authenticated
    USING (is_super_admin(auth.uid()));

-- Create login_attempts table for tracking failed logins
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address TEXT,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for login_attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success);

-- Enable RLS on login_attempts
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempts
CREATE POLICY "Admins can view login attempts"
    ON login_attempts FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));

-- Function to clean old login attempts (keep only last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM login_attempts
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create session_tracking table for monitoring active sessions
CREATE TABLE IF NOT EXISTS session_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    last_activity TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for session_tracking
CREATE INDEX IF NOT EXISTS idx_session_tracking_user_id ON session_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_session_tracking_session_token ON session_tracking(session_token);
CREATE INDEX IF NOT EXISTS idx_session_tracking_is_active ON session_tracking(is_active);

-- Enable RLS on session_tracking
ALTER TABLE session_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
    ON session_tracking FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
    ON session_tracking FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));

-- Users can insert their own sessions
CREATE POLICY "Users can insert their own sessions"
    ON session_tracking FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update their own sessions"
    ON session_tracking FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Function to invalidate old sessions (24 hours)
CREATE OR REPLACE FUNCTION invalidate_old_sessions()
RETURNS void AS $$
BEGIN
    UPDATE session_tracking
    SET is_active = FALSE
    WHERE last_activity < NOW() - INTERVAL '24 hours'
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add user status column to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'status') THEN
        ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'banned'));
    END IF;
END $$;

-- Add last_login column to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'last_login') THEN
        ALTER TABLE profiles ADD COLUMN last_login TIMESTAMPTZ;
    END IF;
END $$;

-- Add login_count column to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'login_count') THEN
        ALTER TABLE profiles ADD COLUMN login_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create function to update last login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET
        last_login = NOW(),
        login_count = COALESCE(login_count, 0) + 1
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update last login on auth
CREATE OR REPLACE TRIGGER on_auth_login
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION update_last_login();

-- Create function for super admins to suspend users
CREATE OR REPLACE FUNCTION admin_suspend_user(target_user_id UUID, reason TEXT)
RETURNS void AS $$
BEGIN
    -- Check if caller is super admin
    IF NOT is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only super admins can suspend users';
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

-- Create function for super admins to unsuspend users
CREATE OR REPLACE FUNCTION admin_unsuspend_user(target_user_id UUID, reason TEXT)
RETURNS void AS $$
BEGIN
    -- Check if caller is super admin
    IF NOT is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only super admins can unsuspend users';
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

-- Create function to check if user is suspended
CREATE OR REPLACE FUNCTION is_user_suspended(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id
        AND status IN ('suspended', 'banned')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy to prevent suspended users from accessing data
CREATE POLICY "Suspended users cannot access their data"
    ON profiles FOR ALL
    TO authenticated
    USING (
        auth.uid() = id
        AND NOT is_user_suspended(auth.uid())
    );

-- Create audit trail for sensitive table changes
CREATE TABLE IF NOT EXISTS data_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on data_audit_log
CREATE INDEX IF NOT EXISTS idx_data_audit_log_table_name ON data_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_record_id ON data_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_changed_at ON data_audit_log(changed_at);

-- Enable RLS on data_audit_log
ALTER TABLE data_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit log
CREATE POLICY "Super admins can view audit log"
    ON data_audit_log FOR SELECT
    TO authenticated
    USING (is_super_admin(auth.uid()));

-- Grant execute permissions on security functions to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_old_login_attempts() TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_old_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_suspend_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unsuspend_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_suspended(UUID) TO authenticated;

-- Create a cron job to clean up old data (if pg_cron is available)
-- This runs daily at midnight
SELECT cron.schedule(
    'cleanup-security-data',
    '0 0 * * *',
    $$
    SELECT cleanup_old_login_attempts();
    SELECT invalidate_old_sessions();
    DELETE FROM security_alerts WHERE resolved = TRUE AND created_at < NOW() - INTERVAL '90 days';
    DELETE FROM admin_activity_log WHERE created_at < NOW() - INTERVAL '180 days';
    $$
);

-- Add comments to tables for documentation
COMMENT ON TABLE security_alerts IS 'Tracks security incidents and alerts that require admin attention';
COMMENT ON TABLE login_attempts IS 'Tracks all login attempts (successful and failed) for security monitoring';
COMMENT ON TABLE session_tracking IS 'Tracks active user sessions for security and session management';
COMMENT ON TABLE data_audit_log IS 'Audit trail for sensitive data changes';

COMMENT ON COLUMN profiles.status IS 'User account status: active, suspended, or banned';
COMMENT ON COLUMN profiles.last_login IS 'Timestamp of user last successful login';
COMMENT ON COLUMN profiles.login_count IS 'Total number of successful logins';
