-- SQL Script to clean database cache, purge net/cron logs, and optimize database size
-- 1. Reload PostgREST API Schema Cache
NOTIFY pgrst, 'reload schema';

-- 2. Truncate bloated HTTP response logs from pg_net extension
TRUNCATE net._http_response;

-- 3. Truncate bloated cron job execution logs from pg_cron extension
TRUNCATE cron.job_run_details;

-- 4. Delete old sent / failed / cancelled scheduled post logs older than 30 days
DELETE FROM public.scheduled_telegram_posts 
WHERE created_at < NOW() - INTERVAL '30 days' 
  AND status IN ('sent', 'failed', 'cancelled');

-- 5. Delete old quiz generations older than 60 days to free up space
DELETE FROM public.quiz_generations 
WHERE created_at < NOW() - INTERVAL '60 days';

-- 6. Schedule automated daily cleanup of pg_net logs (runs daily at 3 AM UTC)
DO $cron$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'cleanup-pg-net-logs';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule cleanup-pg-net-logs: %', SQLERRM;
END;
$cron$;

SELECT cron.schedule(
    'cleanup-pg-net-logs',
    '0 3 * * *',
    $$DELETE FROM net._http_response WHERE created < NOW() - INTERVAL '3 days';$$
);

-- 7. Schedule automated daily cleanup of pg_cron logs (runs daily at 3 AM UTC)
DO $cron$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'cleanup-pg-cron-logs';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule cleanup-pg-cron-logs: %', SQLERRM;
END;
$cron$;

SELECT cron.schedule(
    'cleanup-pg-cron-logs',
    '0 3 * * *',
    $$DELETE FROM cron.job_run_details WHERE start_time < NOW() - INTERVAL '7 days';$$
);
