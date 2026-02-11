-- =============================================
-- DIAGNOSTIC QUERIES FOR SCHEDULER
-- =============================================

-- 1. Check current scheduled quizzes and their status
SELECT id, scheduled_time, status, error_message, updated_at, chat_id
FROM public.scheduled_telegram_posts
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check current regular Telegram posts and their status
SELECT id, status, error_message, created_at, posted_at, channel_id
FROM public.telegram_posts
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check quiz cron job
SELECT jobid, jobname, last_run, active
FROM cron.job
WHERE jobname = 'process-scheduled-telegram-posts';

-- 4. Check regular post cron job
SELECT jobid, jobname, last_run, active
FROM cron.job
WHERE jobname = 'process-scheduled-telegram-posts-worker';

-- 5. Check recent cron job run details (errors here mean the PG function failed)
SELECT start_time, end_time, status, return_message, jobname
FROM cron.job_run_details
WHERE jobname IN ('process-scheduled-telegram-posts', 'process-scheduled-telegram-posts-worker')
ORDER BY start_time DESC
LIMIT 10;

-- 6. Check recent HTTP requests
SELECT id, status_code, error_msg, created, url
FROM net.http_request_queue
ORDER BY created DESC
LIMIT 10;

-- 7. Check system configuration
SELECT key, 
       CASE WHEN key LIKE '%key%' THEN '[REDACTED]' ELSE value END as value 
FROM public.system_config 
WHERE key IN ('supabase_url', 'supabase_service_role_key');
