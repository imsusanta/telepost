-- =============================================
-- CONFIGURE SCHEDULER SETTINGS
-- =============================================
-- This migration sets up configuration for the scheduler
-- to call edge functions via pg_net
-- =============================================

-- Create a secure table to store configuration
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on system_config (only accessible by service role)
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict access to service role only
CREATE POLICY "Only service role can access system_config"
ON public.system_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to set configuration values
CREATE OR REPLACE FUNCTION set_system_config(config_key TEXT, config_value TEXT, config_description TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO public.system_config (key, value, description, updated_at)
  VALUES (config_key, config_value, config_description, now())
  ON CONFLICT (key)
  DO UPDATE SET
    value = EXCLUDED.value,
    description = COALESCE(EXCLUDED.description, system_config.description),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get configuration values
CREATE OR REPLACE FUNCTION get_system_config(config_key TEXT)
RETURNS TEXT AS $$
DECLARE
  config_value TEXT;
BEGIN
  SELECT value INTO config_value
  FROM public.system_config
  WHERE key = config_key;

  RETURN config_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the scheduler function to use the config table as fallback
CREATE OR REPLACE FUNCTION process_scheduled_telegram_posts()
RETURNS void AS $$
DECLARE
  function_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Try to get Supabase configuration from settings or config table
  BEGIN
    supabase_url := current_setting('app.supabase_url', true);
  EXCEPTION WHEN OTHERS THEN
    supabase_url := get_system_config('supabase_url');
  END;

  BEGIN
    service_role_key := current_setting('app.supabase_service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_role_key := get_system_config('supabase_service_role_key');
  END;

  -- Validate configuration
  IF supabase_url IS NULL OR supabase_url = '' THEN
    RAISE WARNING 'Supabase URL not configured. Please set app.supabase_url or insert into system_config table.';
    RETURN;
  END IF;

  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING 'Service role key not configured. Please set app.supabase_service_role_key or insert into system_config table.';
    RETURN;
  END IF;

  -- Build the edge function URL
  function_url := supabase_url || '/functions/v1/process-scheduled-posts';

  -- Log the cron execution
  RAISE NOTICE 'Scheduler cron job started at %', now();
  RAISE NOTICE 'Calling edge function at: %', function_url;

  -- Call the edge function via HTTP POST
  -- The edge function will handle fetching and processing all pending posts
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

    RAISE NOTICE 'Edge function called successfully, request_id: %', request_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to call edge function: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_system_config(TEXT, TEXT, TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION get_system_config(TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION process_scheduled_telegram_posts() TO postgres;

-- Add helpful comment
COMMENT ON TABLE public.system_config IS 'Stores system configuration like Supabase URL and service role key for cron jobs';
COMMENT ON FUNCTION set_system_config(TEXT, TEXT, TEXT) IS 'Sets a system configuration value. Usage: SELECT set_system_config(''supabase_url'', ''https://your-project.supabase.co'', ''Supabase project URL'');';
COMMENT ON FUNCTION get_system_config(TEXT) IS 'Gets a system configuration value';

-- =============================================
-- INSTRUCTIONS FOR SETUP
-- =============================================

-- To configure the scheduler, run these commands in the SQL editor:
--
-- SELECT set_system_config(
--   'supabase_url',
--   'https://your-project-id.supabase.co',
--   'Supabase project URL'
-- );
--
-- SELECT set_system_config(
--   'supabase_service_role_key',
--   'your-service-role-key-here',
--   'Supabase service role key for edge function authentication'
-- );
