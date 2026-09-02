-- Keep the legacy worker entry point safe, but route it through the canonical
-- scheduler dispatcher so Supabase configuration is resolved consistently.
CREATE OR REPLACE FUNCTION public.process_auto_schedule_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  PERFORM public.invoke_edge_function(
    'process-auto-schedule',
    jsonb_build_object(
      'triggered_by', 'cron_system_worker'
    )
  );
END;
$function$;

-- The canonical process-auto-schedule cron is job 24. Remove the duplicate
-- legacy worker cron so auto-schedules are not dispatched twice.
SELECT cron.unschedule(16);

-- The old Telegram text-post cron targets the removed
-- process-scheduled-telegram-posts Edge Function and caused a 404 every minute.
-- Keep the helper function available for compatibility, but stop the stale cron.
SELECT cron.unschedule(26);
