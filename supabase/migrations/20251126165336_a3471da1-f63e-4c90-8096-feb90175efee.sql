-- Create admin audit logs table for tracking super admin actions
CREATE TABLE public.admin_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid,
  target_resource_type text,
  target_resource_id text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_admin_audit_logs_admin_user ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_action_type ON public.admin_audit_logs(action_type);
CREATE INDEX idx_admin_audit_logs_target_user ON public.admin_audit_logs(target_user_id);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all audit logs
CREATE POLICY "Super admins can view audit logs"
ON public.admin_audit_logs FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Super admins can insert audit logs
CREATE POLICY "Super admins can insert audit logs"
ON public.admin_audit_logs FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

-- Create system settings table for global configuration
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Super admins can view system settings
CREATE POLICY "Super admins can view system settings"
ON public.system_settings FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Super admins can manage system settings
CREATE POLICY "Super admins can manage system settings"
ON public.system_settings FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('invitation_defaults', '{"default_max_uses": 10, "default_expiry_days": 30, "allow_unlimited": true, "allow_custom_codes": true}'::jsonb, 'Default settings for invitation codes'),
('user_defaults', '{"auto_approve_signups": true, "default_role": "user", "email_verification_required": true}'::jsonb, 'Default settings for new users'),
('subscription_defaults', '{"trial_days": 7, "grace_period_days": 3, "auto_cancel_expired": false}'::jsonb, 'Default settings for subscriptions'),
('system_maintenance', '{"maintenance_mode": false, "maintenance_message": "System is under maintenance. Please try again later."}'::jsonb, 'System maintenance settings');

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();