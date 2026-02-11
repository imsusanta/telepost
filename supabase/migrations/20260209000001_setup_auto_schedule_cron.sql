-- =============================================
-- AUTO-SCHEDULE CRON JOB & EDGE FUNCTION
-- =============================================
-- This migration sets up the cron job to automatically
-- process auto-scheduling settings and queue quizzes
-- =============================================

-- Create function to process auto-schedules by calling the edge function
CREATE OR REPLACE FUNCTION process_auto_schedule_worker()
RETURNS void AS $$
DECLARE
  function_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get Supabase configuration
  supabase_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.supabase_service_role_key', true);

  -- Build the edge function URL
  function_url := supabase_url || '/functions/v1/process-auto-schedule';

  -- Call the edge function via HTTP POST
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to call auto-schedule edge function: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_auto_schedule_worker() TO postgres;

-- Schedule the cron job to run every minute
SELECT cron.schedule(
  'process-auto-schedule-worker',  -- Job name
  '* * * * *',                   -- Every minute
  $$SELECT process_auto_schedule_worker()$$
);

COMMENT ON FUNCTION process_auto_schedule_worker() IS 'Triggers the Edge Function to process Auto-Schedule settings every minute';
