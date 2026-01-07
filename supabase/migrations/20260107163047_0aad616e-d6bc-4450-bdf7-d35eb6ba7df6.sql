-- Add missing index for request_type
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_request_type ON ai_usage_logs(request_type);

-- Trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_user_ai_settings_updated_at ON user_ai_settings;
CREATE TRIGGER trigger_update_user_ai_settings_updated_at
    BEFORE UPDATE ON user_ai_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_ai_settings_updated_at();

-- Helper function to get AI usage stats
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;