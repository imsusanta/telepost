-- =============================================
-- AUTO-SCHEDULE CRON JOB & EDGE FUNCTION
-- =============================================
-- This migration sets up the cron job to automatically
-- process auto-scheduling settings and queue quizzes
-- =============================================
--
-- RENAMED 2026-08-26: this file was 20260209000001_setup_auto_schedule_cron.sql.
-- It shared the version prefix 20260209000001 with
-- 20260209000001_add_timezone_to_scheduler.sql. A migration version must be
-- unique -- with a collision the CLI cannot order the two files and one is
-- skipped, so a fresh database ends up missing objects.
--
-- The bare cron.schedule() call below was also made repeatable. The legacy
-- 'process-auto-schedule-worker' job it creates is superseded later by
-- 'process-auto-schedule-cron' in 20260825001000_auto_scheduler_architecture.sql;
-- that migration runs after this one, so the end state is still correct.
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

-- Schedule the cron job to run every minute.
-- Drop any existing job with this name first so re-running is safe.
DO $cron$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'process-auto-schedule-worker';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule process-auto-schedule-worker: %', SQLERRM;
END;
$cron$;

SELECT cron.schedule(
  'process-auto-schedule-worker',
  '* * * * *',
  'SELECT process_auto_schedule_worker()'
);

COMMENT ON FUNCTION process_auto_schedule_worker() IS 'Triggers the Edge Function to process Auto-Schedule settings every minute';
