-- =============================================
-- ENHANCED AUTO-SCHEDULE WORKER LOGS
-- =============================================
-- This migration updates the background workers to provide
-- more detailed logging and better error handling
-- =============================================
--
-- NOTE 2026-08-26: the two cron.schedule() calls at the bottom were written as
--   SELECT cron.schedule(...) ON CONFLICT (name) DO UPDATE SET ...
-- ON CONFLICT is INSERT syntax; cron.schedule is a function call, so this was a
-- hard syntax error that aborted the entire migration run on every fresh
-- database. Replaced with a guarded unschedule followed by a plain schedule.

-- Improved trigger function for auto-scheduling
CREATE OR REPLACE FUNCTION public.trigger_auto_schedule()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- 1. Resolve configuration
  supabase_url := current_setting('app.supabase_url', true);
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := get_system_config('supabase_url');
  END IF;

  service_role_key := current_setting('app.supabase_service_role_key', true);
  IF service_role_key IS NULL OR service_role_key = '' THEN
    service_role_key := get_system_config('supabase_service_role_key');
  END IF;

  -- 2. Validate configuration with clear logging
  IF supabase_url IS NULL OR supabase_url = '' THEN
    RAISE WARNING '[Auto-Schedule] CRITICAL: Supabase URL not configured. Auto-scheduling will fail. Please run system initialization in the dashboard.';
    RETURN;
  END IF;

  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING '[Auto-Schedule] CRITICAL: Service role key not configured. Auto-scheduling will fail. Please run system initialization in the dashboard.';
    RETURN;
  END IF;

  -- 3. Build function URL
  function_url := supabase_url || '/functions/v1/process-auto-schedule';

  -- 4. Call the edge function
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'triggered_by', 'cron_system',
        'triggered_at', now()
      )
    ) INTO request_id;

    RAISE NOTICE '[Auto-Schedule] Worker triggered successfully. Request ID: %', request_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[Auto-Schedule] FAILED to call edge function: %', SQLERRM;
  END;
END;
$$;

-- Improved worker for sending posts
CREATE OR REPLACE FUNCTION public.process_scheduled_telegram_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- 1. Resolve configuration
  supabase_url := current_setting('app.supabase_url', true);
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := get_system_config('supabase_url');
  END IF;

  service_role_key := current_setting('app.supabase_service_role_key', true);
  IF service_role_key IS NULL OR service_role_key = '' THEN
    service_role_key := get_system_config('supabase_service_role_key');
  END IF;

  -- 2. Validate configuration
  IF supabase_url IS NULL OR supabase_url = '' THEN
    RAISE WARNING '[Post-Worker] CRITICAL: Supabase URL not configured.';
    RETURN;
  END IF;

  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING '[Post-Worker] CRITICAL: Service role key not configured.';
    RETURN;
  END IF;

  -- 3. Build function URL
  function_url := supabase_url || '/functions/v1/process-scheduled-posts';

  -- 4. Call the edge function
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'triggered_by', 'cron_system',
        'triggered_at', now()
      )
    ) INTO request_id;

    RAISE NOTICE '[Post-Worker] Worker triggered successfully. Request ID: %', request_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[Post-Worker] FAILED to call edge function: %', SQLERRM;
  END;
END;
$$;

-- Ensure both cron jobs are correctly scheduled
DO $cron$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN ('process-auto-schedule-cron', 'process-scheduled-posts-cron');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule existing scheduler cron jobs: %', SQLERRM;
END;
$cron$;

-- 1. Auto-schedule generation (EF1)
SELECT cron.schedule(
  'process-auto-schedule-cron',
  '* * * * *',
  'SELECT public.trigger_auto_schedule()'
);

-- 2. Post processing/sending (EF2)
SELECT cron.schedule(
  'process-scheduled-posts-cron',
  '* * * * *',
  'SELECT public.process_scheduled_telegram_posts()'
);

COMMENT ON FUNCTION public.trigger_auto_schedule() IS 'Triggers the auto-schedule generation logic';
COMMENT ON FUNCTION public.process_scheduled_telegram_posts() IS 'Triggers the scheduled post sender worker';
