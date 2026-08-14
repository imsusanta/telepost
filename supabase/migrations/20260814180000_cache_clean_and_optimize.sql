-- SQL Script to clean database cache, clear stale logs, reload schema cache, and optimize Postgres
-- Run this script in the Supabase Dashboard -> SQL Editor

-- 1. Reload PostgREST API Schema Cache (instant cache refresh)
NOTIFY pgrst, 'reload schema';

-- 2. Clear query plan and session cache
DISCARD ALL;

-- 3. Reset PostgreSQL query statistics cache
SELECT pg_stat_reset();

-- 4. Delete old sent / failed / cancelled scheduled post logs older than 30 days
DELETE FROM public.scheduled_telegram_posts 
WHERE created_at < NOW() - INTERVAL '30 days' 
  AND status IN ('sent', 'failed', 'cancelled');

-- 5. Delete old quiz generations older than 60 days to free up space
DELETE FROM public.quiz_generations 
WHERE created_at < NOW() - INTERVAL '60 days';

-- 6. Perform VACUUM to reclaim disk space back to operating system
VACUUM ANALYZE public.scheduled_telegram_posts;
VACUUM ANALYZE public.quiz_generations;
VACUUM ANALYZE public.telegram_posts;
