-- ============================================================================
-- TelePost Security and Scheduler Concurrency Fixes Migration
-- ============================================================================

-- 1. Revoke public execution on system config functions to secure service role key
REVOKE ALL ON FUNCTION public.get_system_config(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_system_config(TEXT, TEXT, TEXT) FROM PUBLIC;

-- Re-grant permissions strictly to postgres and service_role
GRANT EXECUTE ON FUNCTION public.get_system_config(TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.set_system_config(TEXT, TEXT, TEXT) TO postgres, service_role;

-- 2. Secure get_ai_usage_stats function to prevent BOLA (Broken Object Level Authorization)
CREATE OR REPLACE FUNCTION public.get_ai_usage_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Verify caller matches target user or has super-admin role
    IF p_user_id <> auth.uid() AND NOT public.is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access Denied: Unauthorized query of other user statistics.';
    END IF;

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

-- 3. Create public.claim_due_scheduled_posts() to claim posts atomically and prevent duplicate sends
CREATE OR REPLACE FUNCTION public.claim_due_scheduled_posts()
RETURNS SETOF public.scheduled_telegram_posts AS $$
BEGIN
  RETURN QUERY
  UPDATE public.scheduled_telegram_posts
  SET status = 'processing', updated_at = NOW()
  WHERE public.scheduled_telegram_posts.id IN (
    SELECT s.id 
    FROM public.scheduled_telegram_posts s
    WHERE s.status = 'pending' AND s.scheduled_time <= NOW()
    ORDER BY s.scheduled_time ASC
    LIMIT 5
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to postgres and service_role
GRANT EXECUTE ON FUNCTION public.claim_due_scheduled_posts() TO postgres, service_role;

-- 4. Prevent users from modifying their own billing/payment status directly on the profiles table
CREATE OR REPLACE FUNCTION public.check_profile_billing_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_super_admin(auth.uid()) THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
       NEW.payment_expires_at IS DISTINCT FROM OLD.payment_expires_at OR
       NEW.payment_amount IS DISTINCT FROM OLD.payment_amount OR
       NEW.razorpay_order_id IS DISTINCT FROM OLD.razorpay_order_id OR
       NEW.razorpay_payment_id IS DISTINCT FROM OLD.razorpay_payment_id THEN
      RAISE EXCEPTION 'Access Denied: You cannot modify billing or payment status columns directly.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_profiles_billing_update ON public.profiles;
CREATE TRIGGER check_profiles_billing_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_billing_updates();

