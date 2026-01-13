-- AI Settings and Usage Tracking Migration
-- Stores encrypted Gemini API keys and tracks AI generation usage

-- USER AI SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gemini_api_key_encrypted TEXT,
    api_key_status TEXT DEFAULT 'pending' CHECK (api_key_status IN ('pending', 'active', 'invalid', 'expired')),
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- AI USAGE LOGS TABLE
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('text_generation', 'image_generation', 'caption_generation')),
    prompt TEXT,
    tokens_used INTEGER,
    generation_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_user_ai_settings_user_id ON public.user_ai_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);

-- ROW LEVEL SECURITY
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_ai_settings
DROP POLICY IF EXISTS "Users can view own AI settings" ON public.user_ai_settings;
CREATE POLICY "Users can view own AI settings" ON public.user_ai_settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI settings" ON public.user_ai_settings;
CREATE POLICY "Users can insert own AI settings" ON public.user_ai_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own AI settings" ON public.user_ai_settings;
CREATE POLICY "Users can update own AI settings" ON public.user_ai_settings FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own AI settings" ON public.user_ai_settings;
CREATE POLICY "Users can delete own AI settings" ON public.user_ai_settings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ai_usage_logs
DROP POLICY IF EXISTS "Users can view own AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Users can view own AI usage logs" ON public.ai_usage_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Users can insert own AI usage logs" ON public.ai_usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Super admin access
DROP POLICY IF EXISTS "Super admins can view all AI settings" ON public.user_ai_settings;
CREATE POLICY "Super admins can view all AI settings" ON public.user_ai_settings FOR SELECT USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Super admins can view all AI usage logs" ON public.ai_usage_logs FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Updated_at trigger for user_ai_settings
CREATE TRIGGER update_user_ai_settings_updated_at
    BEFORE UPDATE ON public.user_ai_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();