-- =============================================
-- FIX: Add missing run_due_scheduled_jobs function
-- =============================================
-- This function is called by a webhook or cron job but was missing.
-- It delegates to the appropriate worker functions.
-- =============================================

CREATE OR REPLACE FUNCTION public.run_due_scheduled_jobs(now_ts TIMESTAMPTZ DEFAULT now())
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Log the execution
  RAISE NOTICE 'run_due_scheduled_jobs called at %', now_ts;
  
  -- Delegate to the heartbeat-based auto-schedule trigger
  -- This function is primarily used as an entry point for webhooks
  INSERT INTO scheduler_heartbeat (triggered_at) VALUES (now_ts)
  ON CONFLICT DO NOTHING;
  
  -- Return success
  result := jsonb_build_object(
    'success', true,
    'triggered_at', now_ts,
    'message', 'Scheduled jobs triggered via heartbeat'
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'triggered_at', now_ts
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.run_due_scheduled_jobs(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_due_scheduled_jobs(TIMESTAMPTZ) TO anon;
GRANT EXECUTE ON FUNCTION public.run_due_scheduled_jobs(TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION public.run_due_scheduled_jobs(TIMESTAMPTZ) IS 'Entry point for scheduled job processing, triggered by webhooks or cron';
