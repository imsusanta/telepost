
CREATE TABLE public.reload_loop_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event text NOT NULL CHECK (event IN ('trigger','cleanup_success','cleanup_failed')),
  reload_count integer,
  path text,
  user_agent text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.reload_loop_events TO anon, authenticated;
GRANT SELECT ON public.reload_loop_events TO authenticated;
GRANT ALL ON public.reload_loop_events TO service_role;

ALTER TABLE public.reload_loop_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log reload-loop events"
  ON public.reload_loop_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view reload-loop events"
  ON public.reload_loop_events FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX reload_loop_events_created_at_idx ON public.reload_loop_events (created_at DESC);
CREATE INDEX reload_loop_events_event_idx ON public.reload_loop_events (event);
