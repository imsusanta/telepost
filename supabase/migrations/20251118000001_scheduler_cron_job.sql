-- =============================================
-- SCHEDULER CRON JOB & EDGE FUNCTION
-- =============================================
-- This migration sets up the cron job to automatically
-- send scheduled Telegram quiz posts
-- =============================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to process scheduled posts by calling the edge function
CREATE OR REPLACE FUNCTION process_scheduled_telegram_posts()
RETURNS void AS $$
DECLARE
  scheduled_post RECORD;
  function_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get Supabase configuration
  supabase_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.supabase_service_role_key', true);

  -- Build the edge function URL
  function_url := supabase_url || '/functions/v1/process-scheduled-posts';

  -- Log the cron execution
  RAISE NOTICE 'Scheduler cron job started at %', now();

  -- Call the edge function via HTTP POST
  -- The edge function will handle fetching and processing all pending posts
  BEGIN
    SELECT INTO request_id net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'triggered_by', 'cron',
        'triggered_at', now()
      )
    );

    RAISE NOTICE 'Edge function called successfully, request_id: %', request_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to call edge function: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to postgres role
GRANT EXECUTE ON FUNCTION process_scheduled_telegram_posts() TO postgres;

-- Schedule the cron job to run every minute
-- Note: pg_cron needs to be enabled in Supabase dashboard first
SELECT cron.schedule(
  'process-scheduled-telegram-posts',  -- Job name
  '* * * * *',                         -- Every minute
  $$SELECT process_scheduled_telegram_posts()$$
);

-- Alternative: Create a simple trigger-based approach
-- This doesn't require pg_cron but requires manual triggering

CREATE OR REPLACE FUNCTION trigger_scheduled_post_processing()
RETURNS trigger AS $$
BEGIN
  -- When a new scheduled post is inserted, check if it should be sent immediately
  IF NEW.scheduled_time <= now() AND NEW.status = 'pending' THEN
    -- In a real implementation, this would trigger an edge function
    -- For now, we just log it
    RAISE NOTICE 'Scheduled post % is ready to send', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_scheduled_post_insert
  AFTER INSERT ON public.scheduled_telegram_posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_scheduled_post_processing();

-- =============================================
-- HELPFUL QUERIES FOR MONITORING
-- =============================================

-- View to see pending scheduled posts
CREATE OR REPLACE VIEW scheduled_posts_status AS
SELECT
  id,
  user_id,
  chat_id,
  scheduled_time,
  status,
  error_message,
  created_at,
  CASE
    WHEN scheduled_time <= now() AND status = 'pending' THEN 'READY_TO_SEND'
    WHEN scheduled_time > now() AND status = 'pending' THEN 'WAITING'
    ELSE status
  END as current_status,
  EXTRACT(EPOCH FROM (scheduled_time - now())) as seconds_until_send
FROM public.scheduled_telegram_posts
ORDER BY scheduled_time ASC;

-- Grant access to the view
GRANT SELECT ON scheduled_posts_status TO authenticated;

-- =============================================
-- MANUAL TRIGGER FUNCTION (for testing)
-- =============================================

CREATE OR REPLACE FUNCTION manually_trigger_scheduler()
RETURNS TABLE (
  processed_count INTEGER,
  failed_count INTEGER,
  details JSONB
) AS $$
DECLARE
  processed INT := 0;
  failed INT := 0;
  result_details JSONB := '[]'::jsonb;
BEGIN
  -- Call the processing function
  PERFORM process_scheduled_telegram_posts();

  -- Count results
  SELECT COUNT(*) INTO processed
  FROM public.scheduled_telegram_posts
  WHERE status = 'sent' AND sent_at > now() - INTERVAL '5 minutes';

  SELECT COUNT(*) INTO failed
  FROM public.scheduled_telegram_posts
  WHERE status = 'failed' AND updated_at > now() - INTERVAL '5 minutes';

  -- Return results
  RETURN QUERY SELECT processed, failed, result_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION manually_trigger_scheduler() IS 'Manually trigger the scheduler for testing purposes';
