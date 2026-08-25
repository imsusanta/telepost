
-- Function to trigger the process-auto-schedule edge function
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
    RAISE WARNING 'Supabase URL not configured for auto-schedule trigger.';
    RETURN;
  END IF;

  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING 'Service role key not configured for auto-schedule trigger.';
    RETURN;
  END IF;

  -- Build the edge function URL
  function_url := supabase_url || '/functions/v1/process-auto-schedule';

  -- Log the cron execution
  RAISE NOTICE 'Auto-Schedule trigger worker started at %', now();

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

    RAISE NOTICE 'Auto-Schedule edge function called successfully, request_id: %', request_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to call auto-schedule edge function: %', SQLERRM;
  END;
END;
$$;

-- Schedule the cron job to run every minute
DO $cron$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'process-auto-schedule-cron';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule process-auto-schedule-cron: %', SQLERRM;
END;
$cron$;

SELECT cron.schedule(
  'process-auto-schedule-cron', -- job name
  '* * * * *',                  -- every minute
  'SELECT public.trigger_auto_schedule()'
);
