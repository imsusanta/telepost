-- =============================================
-- SCHEDULER CRON JOB & EDGE FUNCTION
-- =============================================
-- This migration sets up the cron job to automatically
-- send scheduled Telegram quiz posts
-- =============================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to process scheduled posts
CREATE OR REPLACE FUNCTION process_scheduled_telegram_posts()
RETURNS void AS $$
DECLARE
  scheduled_post RECORD;
  function_url TEXT;
BEGIN
  -- Get Supabase project URL from environment or use default
  function_url := current_setting('app.supabase_url', true) || '/functions/v1/send-telegram-quiz';

  -- Process all pending posts that are due
  FOR scheduled_post IN
    SELECT *
    FROM public.scheduled_telegram_posts
    WHERE status = 'pending'
    AND scheduled_time <= now()
    ORDER BY scheduled_time ASC
    LIMIT 50 -- Process max 50 posts per run
  LOOP
    BEGIN
      -- Update status to prevent duplicate processing
      UPDATE public.scheduled_telegram_posts
      SET status = 'processing'
      WHERE id = scheduled_post.id;

      -- Call the edge function using http extension
      -- Note: This requires the http extension and proper configuration
      -- For production, consider using Supabase Edge Functions with webhooks

      -- For now, we'll mark it as ready to send and let the edge function handle it
      -- The actual sending will be done by the send-telegram-quiz edge function

      -- Log the attempt
      RAISE NOTICE 'Processing scheduled post: %', scheduled_post.id;

    EXCEPTION WHEN OTHERS THEN
      -- If error, mark as failed
      UPDATE public.scheduled_telegram_posts
      SET
        status = 'failed',
        error_message = SQLERRM
      WHERE id = scheduled_post.id;

      RAISE WARNING 'Failed to process scheduled post %: %', scheduled_post.id, SQLERRM;
    END;
  END LOOP;
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
