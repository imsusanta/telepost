-- ============================================================================
-- AUTO SCHEDULER ARCHITECTURE
-- ============================================================================
-- This migration replaces the ad-hoc scheduler wiring with one explicit model.
--
-- There are THREE independent pipelines. They were previously conflated, and
-- the earlier repair migration wrongly treated the third one as a duplicate:
--
--   A. Generator   process-auto-schedule
--                  reads auto_schedule_settings, writes scheduled_telegram_posts
--
--   B. Quiz sender process-scheduled-posts
--                  reads scheduled_telegram_posts, sends Telegram quiz polls
--                  statuses: pending -> processing -> sent | failed
--
--   C. Post sender process-scheduled-telegram-posts
--                  reads telegram_posts, sends text/image messages
--                  statuses: scheduled -> posted | failed
--
-- B and C use DIFFERENT TABLES and are both required. Each pipeline gets
-- exactly one cron job, and every worker shares one dispatcher so that config
-- resolution is defined in a single place.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------------------------------------
-- 1. Shared dispatcher
-- ---------------------------------------------------------------------------
-- Previously each worker duplicated URL/key lookup, and one of them read
-- current_setting('app.supabase_url') with no fallback and no NULL check, so it
-- silently POSTed to a NULL URL every minute forever.
CREATE OR REPLACE FUNCTION public.invoke_edge_function(p_path TEXT, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  cron_secret TEXT;
  request_headers JSONB;
  request_id BIGINT;
BEGIN
  supabase_url := NULLIF(current_setting('app.supabase_url', true), '');
  IF supabase_url IS NULL THEN
    supabase_url := public.get_system_config('supabase_url');
  END IF;

  service_role_key := NULLIF(current_setting('app.supabase_service_role_key', true), '');
  IF service_role_key IS NULL THEN
    service_role_key := public.get_system_config('supabase_service_role_key');
  END IF;

  IF supabase_url IS NULL OR supabase_url = '' THEN
    RAISE WARNING '[Scheduler] system_config.supabase_url is not set. Skipping %', p_path;
    RETURN NULL;
  END IF;

  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING '[Scheduler] system_config.supabase_service_role_key is not set. Skipping %', p_path;
    RETURN NULL;
  END IF;

  request_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_role_key
  );

  -- Only sent when the operator has stored a secret matching CRON_SECRET.
  cron_secret := public.get_system_config('cron_secret');
  IF cron_secret IS NOT NULL AND cron_secret <> '' THEN
    request_headers := request_headers || jsonb_build_object('x-cron-secret', cron_secret);
  END IF;

  BEGIN
    SELECT net.http_post(
      url := rtrim(supabase_url, '/') || '/functions/v1/' || p_path,
      headers := request_headers,
      body := p_payload || jsonb_build_object('triggered_by', 'cron_system', 'triggered_at', now())
    ) INTO request_id;
    RETURN request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[Scheduler] Dispatch to % failed: %', p_path, SQLERRM;
    RETURN NULL;
  END;
END;
$fn$;

COMMENT ON FUNCTION public.invoke_edge_function(TEXT, JSONB) IS 'Single place where scheduler workers resolve config and POST to an edge function';

-- ---------------------------------------------------------------------------
-- 2. Retry bookkeeping
-- ---------------------------------------------------------------------------
-- Without this, one transient Telegram error marked a post failed forever.
ALTER TABLE public.scheduled_telegram_posts
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.telegram_posts
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

-- Lease column for pipeline C. A separate timestamp is used instead of a new
-- status value so the existing status check constraint stays untouched.
ALTER TABLE public.telegram_posts
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_scheduled_telegram_posts_due
  ON public.scheduled_telegram_posts (status, scheduled_time);

CREATE INDEX IF NOT EXISTS idx_telegram_posts_due
  ON public.telegram_posts (status, scheduled_time);

-- ---------------------------------------------------------------------------
-- 3. Atomic claiming
-- ---------------------------------------------------------------------------
-- Pipeline B: keep SKIP LOCKED, but respect the retry ceiling and record the attempt.
CREATE OR REPLACE FUNCTION public.claim_due_scheduled_posts()
RETURNS SETOF public.scheduled_telegram_posts
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  RETURN QUERY
  UPDATE public.scheduled_telegram_posts
  SET status = 'processing',
      attempts = public.scheduled_telegram_posts.attempts + 1,
      updated_at = NOW()
  WHERE public.scheduled_telegram_posts.id IN (
    SELECT s.id
    FROM public.scheduled_telegram_posts s
    WHERE s.status = 'pending'
      AND s.scheduled_time <= NOW()
      AND s.attempts < 3
    ORDER BY s.scheduled_time ASC
    LIMIT 5
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$fn$;

-- Pipeline C: previously it just SELECTed status='scheduled' with no claim at
-- all, so two overlapping runs would both send the same post.
CREATE OR REPLACE FUNCTION public.claim_due_telegram_posts()
RETURNS SETOF public.telegram_posts
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  RETURN QUERY
  UPDATE public.telegram_posts
  SET claimed_at = NOW(),
      attempts = public.telegram_posts.attempts + 1
  WHERE public.telegram_posts.id IN (
    SELECT t.id
    FROM public.telegram_posts t
    WHERE t.status = 'scheduled'
      AND t.scheduled_time <= NOW()
      AND t.attempts < 3
      AND (t.claimed_at IS NULL OR t.claimed_at < NOW() - INTERVAL '10 minutes')
    ORDER BY t.scheduled_time ASC
    LIMIT 10
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.claim_due_scheduled_posts() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.claim_due_telegram_posts() TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- 4. Recovery: unstick abandoned leases and requeue retryable failures
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recover_scheduler_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  -- Worker died mid-flight (edge function timeout, redeploy, etc.)
  UPDATE public.scheduled_telegram_posts
  SET status = 'pending', updated_at = NOW()
  WHERE status = 'processing'
    AND updated_at < NOW() - INTERVAL '10 minutes'
    AND attempts < 3;

  -- Transient failures get another chance, with a short backoff.
  UPDATE public.scheduled_telegram_posts
  SET status = 'pending', updated_at = NOW()
  WHERE status = 'failed'
    AND attempts < 3
    AND updated_at < NOW() - INTERVAL '5 minutes';

  UPDATE public.telegram_posts
  SET claimed_at = NULL
  WHERE status = 'scheduled'
    AND claimed_at IS NOT NULL
    AND claimed_at < NOW() - INTERVAL '10 minutes'
    AND attempts < 3;

  UPDATE public.telegram_posts
  SET status = 'scheduled', claimed_at = NULL
  WHERE status = 'failed'
    AND attempts < 3
    AND scheduled_time > NOW() - INTERVAL '1 day';
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.recover_scheduler_jobs() TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- 5. One worker per pipeline, all thin wrappers over the dispatcher
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_auto_schedule()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  PERFORM public.invoke_edge_function('process-auto-schedule');
END;
$fn$;

CREATE OR REPLACE FUNCTION public.process_scheduled_telegram_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  PERFORM public.recover_scheduler_jobs();
  PERFORM public.invoke_edge_function('process-scheduled-posts');
END;
$fn$;

-- Pipeline C worker. The previous version of this function was dropped by the
-- earlier repair migration on the incorrect assumption that it was a duplicate.
CREATE OR REPLACE FUNCTION public.process_telegram_text_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  PERFORM public.invoke_edge_function('process-scheduled-telegram-posts');
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.trigger_auto_schedule() TO postgres;
GRANT EXECUTE ON FUNCTION public.process_scheduled_telegram_posts() TO postgres;
GRANT EXECUTE ON FUNCTION public.process_telegram_text_posts() TO postgres;

-- ---------------------------------------------------------------------------
-- 6. Exactly three cron jobs
-- ---------------------------------------------------------------------------
SELECT public.safe_unschedule_cron('process-scheduled-telegram-posts-worker');
SELECT public.safe_unschedule_cron('process-scheduled-telegram-posts');
SELECT public.safe_unschedule_cron('process-auto-schedule-cron');
SELECT public.safe_unschedule_cron('process-scheduled-posts-cron');
SELECT public.safe_unschedule_cron('process-telegram-text-posts-cron');

SELECT cron.schedule('process-auto-schedule-cron', '* * * * *',
  $job$SELECT public.trigger_auto_schedule()$job$);

SELECT cron.schedule('process-scheduled-posts-cron', '* * * * *',
  $job$SELECT public.process_scheduled_telegram_posts()$job$);

SELECT cron.schedule('process-telegram-text-posts-cron', '* * * * *',
  $job$SELECT public.process_telegram_text_posts()$job$);

-- Legacy wrapper, superseded by process_telegram_text_posts().
DROP FUNCTION IF EXISTS public.process_scheduled_telegram_posts_worker();

-- One-time recovery for everything stranded while the scheduler was dead.
UPDATE public.scheduled_telegram_posts SET attempts = 0 WHERE status IN ('pending', 'processing', 'failed');
UPDATE public.telegram_posts SET attempts = 0, claimed_at = NULL WHERE status IN ('scheduled', 'failed');
SELECT public.recover_scheduler_jobs();
