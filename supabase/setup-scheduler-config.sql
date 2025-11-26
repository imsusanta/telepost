-- =============================================
-- SCHEDULER CONFIGURATION SETUP SCRIPT
-- =============================================
-- Run this script in your Supabase SQL Editor to configure
-- the poll scheduler with your project credentials
-- =============================================

-- IMPORTANT: Replace the placeholder values below with your actual credentials
-- You can find these values in your Supabase Dashboard:
-- 1. Project URL: Settings > API > Project URL
-- 2. Service Role Key: Settings > API > Service Role Key (Keep this secret!)

-- Set the Supabase project URL
SELECT set_system_config(
  'supabase_url',
  'https://YOUR_PROJECT_ID.supabase.co',  -- REPLACE THIS with your actual project URL
  'Supabase project URL for calling edge functions'
);

-- Set the Supabase service role key
SELECT set_system_config(
  'supabase_service_role_key',
  'YOUR_SERVICE_ROLE_KEY_HERE',  -- REPLACE THIS with your actual service role key
  'Supabase service role key for authenticating edge function calls'
);

-- Verify configuration
SELECT
  key,
  CASE
    WHEN key = 'supabase_service_role_key' THEN LEFT(value, 20) || '...[REDACTED]'
    ELSE value
  END as value,
  description,
  created_at,
  updated_at
FROM public.system_config
WHERE key IN ('supabase_url', 'supabase_service_role_key')
ORDER BY key;

-- Check if cron job is scheduled
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'process-scheduled-telegram-posts';

-- View pending scheduled posts
SELECT
  id,
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
  EXTRACT(EPOCH FROM (scheduled_time - now())) / 60 as minutes_until_send
FROM public.scheduled_telegram_posts
ORDER BY scheduled_time ASC
LIMIT 10;

-- =============================================
-- MANUAL TESTING
-- =============================================

-- To manually trigger the scheduler for testing:
-- SELECT process_scheduled_telegram_posts();

-- To manually test if any posts are ready:
-- SELECT * FROM scheduled_posts_status WHERE current_status = 'READY_TO_SEND';

-- To call the edge function directly for testing:
-- Make a POST request to: https://YOUR_PROJECT_ID.supabase.co/functions/v1/process-scheduled-posts
-- With header: Authorization: Bearer YOUR_SERVICE_ROLE_KEY
-- Body: {"triggered_by": "manual", "triggered_at": "2025-11-26T00:00:00Z"}
