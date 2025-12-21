-- Fix: Set search_path for set_story_expires_at function to prevent search path manipulation
CREATE OR REPLACE FUNCTION public.set_story_expires_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
    IF NEW.posted_at IS NOT NULL AND NEW.is_highlight = FALSE THEN
        NEW.expires_at := NEW.posted_at + (COALESCE(NEW.duration_seconds, 24) || ' hours')::INTERVAL;
    END IF;
    RETURN NEW;
END;
$function$;