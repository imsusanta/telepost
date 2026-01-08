-- Create system_features table
CREATE TABLE IF NOT EXISTS public.system_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_core_feature BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_features ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view features
CREATE POLICY "Anyone can view system features" ON public.system_features FOR SELECT USING (true);

-- Only super admins can manage features
CREATE POLICY "Super admins can manage system features" ON public.system_features FOR ALL USING (is_super_admin(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_system_features_updated_at
  BEFORE UPDATE ON public.system_features
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Seed the two features
INSERT INTO public.system_features (feature_key, display_name, description, is_enabled, is_core_feature)
VALUES
  ('telegram_quiz', 'Telegram Quiz', 'Core quiz generation and Telegram posting feature', true, true),
  ('lms_attendance', 'Learning Management & Attendance', 'Student management, batches, attendance tracking, and leave requests', true, false)
ON CONFLICT (feature_key) DO NOTHING;