-- =============================================
-- COMPREHENSIVE SCHEMA FIX
-- =============================================
-- This migration ensures all schemas are properly set up
-- and fixes any inconsistencies in the database
-- =============================================

-- ============================================
-- 1. ENSURE ALL BASE TABLES EXIST
-- ============================================

-- Profiles table updates
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS can_purchase_plans BOOLEAN DEFAULT true;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Channels table updates
ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS last_auto_generated_at TIMESTAMPTZ;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_channels_auto_generate ON public.channels ((settings->>'auto_generate_quizzes'))
WHERE (settings->>'auto_generate_quizzes')::boolean = true;

-- ============================================
-- 2. ENSURE ALL PREMIUM TABLES EXIST
-- ============================================

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  category TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

-- Support Ticket Messages
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_staff_reply BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);

-- User Branding
CREATE TABLE IF NOT EXISTS public.user_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  logo_storage_path TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#8b5cf6',
  pdf_header TEXT,
  pdf_footer TEXT,
  institute_name TEXT,
  institute_website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Usage Tracking
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quizzes_generated_this_month INTEGER NOT NULL DEFAULT 0,
  pdfs_uploaded_this_month INTEGER NOT NULL DEFAULT 0,
  total_quizzes_generated INTEGER NOT NULL DEFAULT 0,
  total_pdfs_uploaded INTEGER NOT NULL DEFAULT 0,
  total_storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Admin Activity Log
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id ON public.admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target_user ON public.admin_activity_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON public.admin_activity_log(created_at DESC);

-- Security Alerts
CREATE TABLE IF NOT EXISTS public.security_alerts (
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

CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON public.security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON public.security_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON public.security_alerts(created_at);

-- Login Attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON public.login_attempts(success);

-- Session Tracking
CREATE TABLE IF NOT EXISTS public.session_tracking (
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

CREATE INDEX IF NOT EXISTS idx_session_tracking_user_id ON public.session_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_session_tracking_session_token ON public.session_tracking(session_token);
CREATE INDEX IF NOT EXISTS idx_session_tracking_is_active ON public.session_tracking(is_active);

-- Data Audit Log
CREATE TABLE IF NOT EXISTS public.data_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_audit_log_table_name ON public.data_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_record_id ON public.data_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_changed_at ON public.data_audit_log(changed_at);

-- ============================================
-- 3. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE OR REPLACE RLS POLICIES
-- ============================================

-- Support Tickets Policies
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own tickets" ON public.support_tickets;
CREATE POLICY "Users can create their own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;
CREATE POLICY "Users can update their own tickets"
ON public.support_tickets FOR UPDATE
USING (auth.uid() = user_id);

-- Support Ticket Messages Policies
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can view messages for their tickets"
ON public.support_ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_ticket_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create messages for their tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can create messages for their tickets"
ON public.support_ticket_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- User Branding Policies
DROP POLICY IF EXISTS "Users can view their own branding" ON public.user_branding;
CREATE POLICY "Users can view their own branding"
ON public.user_branding FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own branding" ON public.user_branding;
CREATE POLICY "Users can insert their own branding"
ON public.user_branding FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own branding" ON public.user_branding;
CREATE POLICY "Users can update their own branding"
ON public.user_branding FOR UPDATE
USING (auth.uid() = user_id);

-- Usage Tracking Policies
DROP POLICY IF EXISTS "Users can view their own usage" ON public.usage_tracking;
CREATE POLICY "Users can view their own usage"
ON public.usage_tracking FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own usage" ON public.usage_tracking;
CREATE POLICY "Users can insert their own usage"
ON public.usage_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own usage" ON public.usage_tracking;
CREATE POLICY "Users can update their own usage"
ON public.usage_tracking FOR UPDATE
USING (auth.uid() = user_id);

-- Admin Activity Log Policies
DROP POLICY IF EXISTS "Admins can view activity log" ON public.admin_activity_log;
CREATE POLICY "Admins can view activity log"
ON public.admin_activity_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Admins can insert activity log" ON public.admin_activity_log;
CREATE POLICY "Admins can insert activity log"
ON public.admin_activity_log FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Security Alerts Policies
DROP POLICY IF EXISTS "Admins can view security alerts" ON public.security_alerts;
CREATE POLICY "Admins can view security alerts"
ON public.security_alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Super admins can insert security alerts" ON public.security_alerts;
CREATE POLICY "Super admins can insert security alerts"
ON public.security_alerts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Super admins can update security alerts" ON public.security_alerts;
CREATE POLICY "Super admins can update security alerts"
ON public.security_alerts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Login Attempts Policies
DROP POLICY IF EXISTS "Admins can view login attempts" ON public.login_attempts;
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Session Tracking Policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.session_tracking;
CREATE POLICY "Users can view their own sessions"
ON public.session_tracking FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid()
  AND role IN ('admin', 'super_admin')
));

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.session_tracking;
-- This policy is now merged with the above

DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.session_tracking;
CREATE POLICY "Users can insert their own sessions"
ON public.session_tracking FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.session_tracking;
CREATE POLICY "Users can update their own sessions"
ON public.session_tracking FOR UPDATE
USING (user_id = auth.uid());

-- Data Audit Log Policies
DROP POLICY IF EXISTS "Super admins can view audit log" ON public.data_audit_log;
CREATE POLICY "Super admins can view audit log"
ON public.data_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- ============================================
-- 5. CREATE OR REPLACE HELPER FUNCTIONS
-- ============================================

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

-- ============================================
-- 6. ADD TRIGGERS FOR UPDATED_AT
-- ============================================

-- Support Tickets
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User Branding
DROP TRIGGER IF EXISTS update_user_branding_updated_at ON public.user_branding;
CREATE TRIGGER update_user_branding_updated_at
BEFORE UPDATE ON public.user_branding
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Usage Tracking
DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON public.usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at
BEFORE UPDATE ON public.usage_tracking
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Security Alerts
DROP TRIGGER IF EXISTS update_security_alerts_updated_at ON public.security_alerts;
CREATE TRIGGER update_security_alerts_updated_at
BEFORE UPDATE ON public.security_alerts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. ADD HELPFUL COMMENTS
-- ============================================

COMMENT ON TABLE public.profiles IS 'User profiles with authentication and role information';
COMMENT ON COLUMN public.profiles.role IS 'User role: user, admin, or super_admin';
COMMENT ON COLUMN public.profiles.can_purchase_plans IS 'Whether user is allowed to purchase subscription plans';
COMMENT ON COLUMN public.profiles.status IS 'User account status: active, suspended, or banned';
COMMENT ON COLUMN public.profiles.last_login IS 'Timestamp of user last successful login';
COMMENT ON COLUMN public.profiles.login_count IS 'Total number of successful logins';

COMMENT ON TABLE public.channels IS 'Telegram channels with isolated knowledge bases for each channel';
COMMENT ON COLUMN public.channels.last_auto_generated_at IS 'Timestamp of last automated quiz generation for this channel';

COMMENT ON TABLE public.support_tickets IS 'Support tickets for premium users';
COMMENT ON TABLE public.support_ticket_messages IS 'Messages within support tickets';
COMMENT ON TABLE public.user_branding IS 'Custom branding settings for premium users';
COMMENT ON TABLE public.usage_tracking IS 'Track usage statistics per user';
COMMENT ON TABLE public.admin_activity_log IS 'Audit log for admin actions';
COMMENT ON TABLE public.security_alerts IS 'Tracks security incidents and alerts';
COMMENT ON TABLE public.login_attempts IS 'Tracks all login attempts for security monitoring';
COMMENT ON TABLE public.session_tracking IS 'Tracks active user sessions';
COMMENT ON TABLE public.data_audit_log IS 'Audit trail for sensitive data changes';

-- ============================================
-- COMPLETED SUCCESSFULLY
-- ============================================
