-- =============================================
-- SCHEDULER REPAIR
-- =============================================
-- Fixes three problems that stopped the scheduler completely:
--
-- 1. 20260411000000_fix_scheduler_worker_logs.sql used
--      SELECT cron.schedule(...) ON CONFLICT (name) DO UPDATE ...
--    ON CONFLICT is only valid on INSERT, so that statement is a syntax
--    error and the ENTIRE migration was rolled back. The improved worker
--    functions and their cron jobs were therefore never created.
--
-- 2. 20260116000000 called cron.unschedule() unconditionally, which raises
--    when the job does not exist, breaking that migration on fresh projects.
--
-- 3. Four different cron jobs were competing over scheduled_telegram_posts,
--    including one worker that read app.supabase_url with no fallback and no
--    NULL check, so it posted to a NULL URL every minute.
-- =============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------
-- Safe unschedule helper (cron.unschedule raises on unknown job names)
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.safe_unschedule_cron(p_job_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = p_job_name) THEN
    PERFORM cron.unschedule(p_job_name);
    RAISE NOTICE '[Scheduler] Removed cron job %', p_job_name;
  END IF;
END;
$fn$;

-- ---------------------------------------------
-- Auto-schedule generator worker
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_auto_schedule()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  function_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  cron_secret TEXT;
  request_headers JSONB;
  request_id BIGINT;
BEGIN
  supabase_url := NULLIF(current_setting('app.supabase_url', true), '');
  IF supabase_url IS NULL THEN
    supabase_url := get_system_config('supabase_url');
  END IF;

  service_role_key := NULLIF(current_setting('app.supabase_service_role_key', true), '');
  IF service_role_key IS NULL THEN
    service_role_key := get_system_config('supabase_service_role_key');
  END IF;

  IF supabase_url IS NULL OR supabase_url = '' THEN
    RAISE WARNING '[Auto-Schedule] Supabase URL is not configured (system_config.supabase_url). Skipping run.';
    RETURN;
  END IF;

  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING '[Auto-Schedule] Service role key is not configured (system_config.supabase_service_role_key). Skipping run.';
    RETURN;
  END IF;

  function_url := rtrim(supabase_url, '/') || '/functions/v1/process-auto-schedule';

  request_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_role_key
  );

  -- Optional shared secret, used when CRON_SECRET is set on the edge functions.
  cron_secret := get_system_config('cron_secret');
  IF cron_secret IS NOT NULL AND cron_secret <> '' THEN
    request_headers := request_headers || jsonb_build_object('x-cron-secret', cron_secret);
  END IF;

  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := request_headers,
      body := jsonb_build_object('triggered_by', 'cron_system', 'triggered_at', now())
    ) INTO request_id;

    RAISE NOTICE '[Auto-Schedule] Worker triggered. Request ID: %', request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[Auto-Schedule] Failed to call edge function: %', SQLERRM;
  END;
END;
$fn$;

-- ---------------------------------------------
-- Scheduled post sender worker
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.process_scheduled_telegram_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  function_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  cron_secret TEXT;
  request_headers JSONB;
  request_id BIGINT;
BEGIN
  supabase_url := NULLIF(current_setting('app.supabase_url', true), '');
  IF supabase_url IS NULL THEN
    supabase_url := get_system_config('supabase_url');
  END IF;

  service_role_key := NULLIF(current_setting('app.supabase_service_role_key', true), '');
  IF service_role_key IS NULL THEN
    service_role_key := get_system_config('supabase_service_role_key');
  END IF;

  IF supabase_url IS NULL OR supabase_url = '' THEN
    RAISE WARNING '[Post-Worker] Supabase URL is not configured (system_config.supabase_url). Skipping run.';
    RETURN;
  END IF;

  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING '[Post-Worker] Service role key is not configured (system_config.supabase_service_role_key). Skipping run.';
    RETURN;
  END IF;

  function_url := rtrim(supabase_url, '/') || '/functions/v1/process-scheduled-posts';

  request_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_role_key
  );

  cron_secret := get_system_config('cron_secret');
  IF cron_secret IS NOT NULL AND cron_secret <> '' THEN
    request_headers := request_headers || jsonb_build_object('x-cron-secret', cron_secret);
  END IF;

  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := request_headers,
      body := jsonb_build_object('triggered_by', 'cron_system', 'triggered_at', now())
    ) INTO request_id;

    RAISE NOTICE '[Post-Worker] Worker triggered. Request ID: %', request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[Post-Worker] Failed to call edge function: %', SQLERRM;
  END;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.trigger_auto_schedule() TO postgres;
GRANT EXECUTE ON FUNCTION public.process_scheduled_telegram_posts() TO postgres;

-- ---------------------------------------------
-- Collapse the competing cron jobs into two canonical ones
-- ---------------------------------------------
SELECT public.safe_unschedule_cron('process-scheduled-telegram-posts-worker');
SELECT public.safe_unschedule_cron('process-scheduled-telegram-posts');
SELECT public.safe_unschedule_cron('process-auto-schedule-cron');
SELECT public.safe_unschedule_cron('process-scheduled-posts-cron');

SELECT cron.schedule(
  'process-auto-schedule-cron',
  '* * * * *',
  $job$SELECT public.trigger_auto_schedule()$job$
);

SELECT cron.schedule(
  'process-scheduled-posts-cron',
  '* * * * *',
  $job$SELECT public.process_scheduled_telegram_posts()$job$
);

-- Legacy worker: read app.supabase_url with no fallback and no NULL check.
DROP FUNCTION IF EXISTS public.process_scheduled_telegram_posts_worker();

-- ---------------------------------------------
-- Release posts that got stuck while the workers were dead
-- ---------------------------------------------
UPDATE public.scheduled_telegram_posts
SET status = 'pending', updated_at = now()
WHERE status = 'processing'
  AND updated_at < now() - INTERVAL '10 minutes';

COMMENT ON FUNCTION public.trigger_auto_schedule() IS 'Cron worker: calls the process-auto-schedule edge function every minute';
COMMENT ON FUNCTION public.process_scheduled_telegram_posts() IS 'Cron worker: calls the process-scheduled-posts edge function every minute';
COMMENT ON FUNCTION public.safe_unschedule_cron(TEXT) IS 'Unschedules a pg_cron job only if it exists';
