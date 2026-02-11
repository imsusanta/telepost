-- =============================================
-- FIX QUIZ SCHEDULER WORKER
-- =============================================
-- This migration updates the quiz scheduler worker to be more robust
-- and ensures it correctly triggers the edge function.
-- =============================================

-- Ensure extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update the processing function to be more robust and log better
CREATE OR REPLACE FUNCTION public.process_scheduled_telegram_posts()
RETURNS void AS $$
DECLARE
  function_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Try to get Supabase configuration from settings or config table
  supabase_url := current_setting('app.supabase_url', true);
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := get_system_config('supabase_url');
  END IF;

  service_role_key := current_setting('app.supabase_service_role_key', true);
  IF service_role_key IS NULL OR service_role_key = '' THEN
    service_role_key := get_system_config('supabase_service_role_key');
  END IF;

  -- Validate configuration
  IF supabase_url IS NULL OR supabase_url = '' THEN
    RAISE WARNING 'Supabase URL not configured for quiz scheduler.';
    RETURN;
  END IF;

  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING 'Service role key not configured for quiz scheduler.';
    RETURN;
  END IF;

  -- Build the edge function URL
  function_url := supabase_url || '/functions/v1/process-scheduled-posts';

  -- Log the cron execution
  RAISE NOTICE 'Quiz Scheduler worker triggered at %', now();

  -- Call the edge function via HTTP POST
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'triggered_by', 'cron',
        'triggered_at', now()
      )
    ) INTO request_id;

    RAISE NOTICE 'Quiz edge function called successfully, request_id: %', request_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to call quiz edge function: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure execute permission
GRANT EXECUTE ON FUNCTION public.process_scheduled_telegram_posts() TO postgres;

-- Reset and reschedule the cron job to ensure it's active and correctly named
SELECT cron.unschedule('process-scheduled-telegram-posts');

SELECT cron.schedule(
  'process-scheduled-telegram-posts',  -- Job name
  '* * * * *',                         -- Every minute
  $$SELECT public.process_scheduled_telegram_posts()$$
);

-- Fix any stuck processing posts from previous failed runs (Safety measure)
UPDATE public.scheduled_telegram_posts 
SET status = 'pending' 
WHERE status = 'processing' AND updated_at < now() - INTERVAL '10 minutes';
