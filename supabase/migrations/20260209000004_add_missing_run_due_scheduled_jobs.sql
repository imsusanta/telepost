-- =============================================
-- FIX: Add missing run_due_scheduled_jobs function
-- =============================================
-- This function is called by a webhook or cron job but was missing.
-- It delegates to the appropriate worker functions.
-- =============================================
--
-- RENAMED 2026-08-26: this file was
-- 20260209000002_add_missing_run_due_scheduled_jobs.sql and shared the version
-- prefix 20260209000002 with 20260209000002_heartbeat_workaround.sql. Besides
-- being an unorderable collision, the ordering actually matters: the function
-- below writes to scheduler_heartbeat, which heartbeat_workaround creates.
-- Moving this to 20260209000004 guarantees it runs afterwards.
--
-- BUG FIX 2026-08-26: the INSERT targeted a column named triggered_at, but
-- scheduler_heartbeat has (id, pulse_time). Every call therefore raised
-- "column triggered_at of relation scheduler_heartbeat does not exist", was
-- swallowed by the exception handler below, and returned success=false. The
-- heartbeat was never actually recorded.

CREATE OR REPLACE FUNCTION public.run_due_scheduled_jobs(now_ts TIMESTAMPTZ DEFAULT now())
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Log the execution
  RAISE NOTICE 'run_due_scheduled_jobs called at %', now_ts;

  -- Delegate to the heartbeat-based auto-schedule trigger
  -- This function is primarily used as an entry point for webhooks
  INSERT INTO scheduler_heartbeat (pulse_time) VALUES (now_ts);

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
