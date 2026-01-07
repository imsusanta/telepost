-- AI Settings and Usage Tracking Migration
-- Stores encrypted Gemini API keys and tracks AI generation usage

-- ============================================================================
-- USER AI SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Encrypted API key storage
    gemini_api_key_encrypted TEXT,
    
    -- API key status
    api_key_status TEXT DEFAULT 'pending' CHECK (api_key_status IN ('pending', 'active', 'invalid', 'expired')),
    last_verified_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one settings record per user
    UNIQUE(user_id)
);

-- ============================================================================
-- AI USAGE LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Request details
    request_type TEXT NOT NULL CHECK (request_type IN ('text_generation', 'image_generation', 'caption_generation')),
    prompt TEXT,
    
    -- Usage metrics
    tokens_used INTEGER,
    generation_time_ms INTEGER,
    
    -- Response status
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_ai_settings_user_id ON user_ai_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_request_type ON ai_usage_logs(request_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own AI settings
CREATE POLICY "Users can view own AI settings"
    ON user_ai_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI settings"
    ON user_ai_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI settings"
    ON user_ai_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI settings"
    ON user_ai_settings FOR DELETE
    USING (auth.uid() = user_id);

-- Users can only access their own usage logs
CREATE POLICY "Users can view own AI usage logs"
    ON ai_usage_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI usage logs"
    ON ai_usage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_ai_settings_updated_at
    BEFORE UPDATE ON user_ai_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_ai_settings_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get AI usage stats for a user
CREATE OR REPLACE FUNCTION get_ai_usage_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'posts_generated_today', (
            SELECT COUNT(*) FROM ai_usage_logs 
            WHERE user_id = p_user_id 
            AND request_type = 'text_generation'
            AND success = true
            AND created_at >= CURRENT_DATE
        ),
        'images_generated_today', (
            SELECT COUNT(*) FROM ai_usage_logs 
            WHERE user_id = p_user_id 
            AND request_type = 'image_generation'
            AND success = true
            AND created_at >= CURRENT_DATE
        ),
        'total_calls_this_month', (
            SELECT COUNT(*) FROM ai_usage_logs 
            WHERE user_id = p_user_id 
            AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        ),
        'total_tokens_this_month', (
            SELECT COALESCE(SUM(tokens_used), 0) FROM ai_usage_logs 
            WHERE user_id = p_user_id 
            AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT ALL ON user_ai_settings TO authenticated;
GRANT ALL ON ai_usage_logs TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_ai_settings IS 'Stores encrypted Gemini API keys for AI-powered post generation';
COMMENT ON TABLE ai_usage_logs IS 'Tracks AI generation usage for analytics and cost monitoring';
COMMENT ON COLUMN user_ai_settings.gemini_api_key_encrypted IS 'AES-256 encrypted Gemini API key';
COMMENT ON COLUMN user_ai_settings.api_key_status IS 'Current status of the API key: pending, active, invalid, or expired';
