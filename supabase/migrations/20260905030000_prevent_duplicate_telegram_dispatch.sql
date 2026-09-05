-- Prevent a second Telegram send when the process crashes after Telegram
-- accepts a message and before telegram_message_id is written.
-- Additive. Prefer a missed retry over a duplicate delivery.

ALTER TABLE public.telegram_posts
  ADD COLUMN IF NOT EXISTS dispatch_started_at TIMESTAMPTZ;

ALTER TABLE public.telegram_stories
  ADD COLUMN IF NOT EXISTS dispatch_started_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.mark_telegram_post_dispatch_started(
  p_id UUID,
  p_worker_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.telegram_posts
  SET dispatch_started_at = COALESCE(dispatch_started_at, now())
  WHERE id = p_id
    AND lease_owner = p_worker_id
    AND telegram_message_id IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_telegram_story_dispatch_started(
  p_story_id UUID,
  p_worker_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.telegram_stories
  SET dispatch_started_at = COALESCE(dispatch_started_at, now())
  WHERE story_id = p_story_id
    AND lease_owner = p_worker_id
    AND telegram_message_id IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_telegram_post_for_dispatch(
  p_post_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_worker_id TEXT DEFAULT NULL,
  p_allow_scheduled BOOLEAN DEFAULT TRUE
)
RETURNS SETOF public.telegram_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_worker TEXT := COALESCE(NULLIF(p_worker_id, ''), 'worker-' || gen_random_uuid()::text);
BEGIN
  IF p_post_id IS NULL THEN
    RAISE EXCEPTION 'p_post_id is required';
  END IF;

  RETURN QUERY
  UPDATE public.telegram_posts AS target
  SET claimed_at = now(),
      attempts = COALESCE(target.attempts, 0) + 1,
      lease_owner = v_worker,
      lease_expires_at = now() + INTERVAL '8 minutes',
      error_message = NULL
  WHERE target.id = p_post_id
    AND target.telegram_message_id IS NULL
    AND target.dispatch_started_at IS NULL
    AND (p_user_id IS NULL OR target.user_id = p_user_id)
    AND (
      target.status = 'draft'
      OR (p_allow_scheduled AND target.status = 'scheduled')
    )
    AND (target.lease_expires_at IS NULL OR target.lease_expires_at < now())
    AND COALESCE(target.attempts, 0) < 5
  RETURNING target.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_due_telegram_posts(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_worker_id TEXT DEFAULT NULL
)
RETURNS SETOF public.telegram_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 10);
  v_worker TEXT := COALESCE(NULLIF(p_worker_id, ''), 'worker-' || gen_random_uuid()::text);
BEGIN
  RETURN QUERY
  UPDATE public.telegram_posts AS target
  SET claimed_at = now(),
      attempts = COALESCE(target.attempts, 0) + 1,
      lease_owner = v_worker,
      lease_expires_at = now() + INTERVAL '8 minutes',
      error_message = NULL
  WHERE target.id IN (
    SELECT p.id
    FROM public.telegram_posts p
    WHERE p.status = 'scheduled'
      AND p.scheduled_time <= now()
      AND p.telegram_message_id IS NULL
      AND p.dispatch_started_at IS NULL
      AND COALESCE(p.attempts, 0) < 3
      AND (p.lease_expires_at IS NULL OR p.lease_expires_at < now())
      AND (p_user_id IS NULL OR p.user_id = p_user_id)
    ORDER BY p.scheduled_time ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING target.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_telegram_story_for_dispatch(
  p_story_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_worker_id TEXT DEFAULT NULL,
  p_allow_scheduled BOOLEAN DEFAULT TRUE
)
RETURNS SETOF public.telegram_stories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_worker TEXT := COALESCE(NULLIF(p_worker_id, ''), 'worker-' || gen_random_uuid()::text);
BEGIN
  IF p_story_id IS NULL THEN
    RAISE EXCEPTION 'p_story_id is required';
  END IF;

  RETURN QUERY
  UPDATE public.telegram_stories AS target
  SET claimed_at = now(),
      attempts = COALESCE(target.attempts, 0) + 1,
      lease_owner = v_worker,
      lease_expires_at = now() + INTERVAL '8 minutes',
      error_message = NULL
  WHERE target.story_id = p_story_id
    AND target.telegram_message_id IS NULL
    AND target.dispatch_started_at IS NULL
    AND (p_user_id IS NULL OR target.user_id = p_user_id)
    AND (
      target.status = 'draft'
      OR (p_allow_scheduled AND target.status = 'scheduled')
    )
    AND (target.lease_expires_at IS NULL OR target.lease_expires_at < now())
    AND COALESCE(target.attempts, 0) < 5
  RETURNING target.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_due_telegram_stories(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_worker_id TEXT DEFAULT NULL
)
RETURNS SETOF public.telegram_stories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 10);
  v_worker TEXT := COALESCE(NULLIF(p_worker_id, ''), 'worker-' || gen_random_uuid()::text);
BEGIN
  RETURN QUERY
  UPDATE public.telegram_stories AS target
  SET claimed_at = now(),
      attempts = COALESCE(target.attempts, 0) + 1,
      lease_owner = v_worker,
      lease_expires_at = now() + INTERVAL '8 minutes',
      error_message = NULL
  WHERE target.story_id IN (
    SELECT s.story_id
    FROM public.telegram_stories s
    WHERE s.status = 'scheduled'
      AND s.scheduled_time <= now()
      AND s.telegram_message_id IS NULL
      AND s.dispatch_started_at IS NULL
      AND COALESCE(s.attempts, 0) < 3
      AND (s.lease_expires_at IS NULL OR s.lease_expires_at < now())
      AND (p_user_id IS NULL OR s.user_id = p_user_id)
    ORDER BY s.scheduled_time ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING target.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_telegram_post(
  p_id UUID,
  p_worker_id TEXT,
  p_status TEXT,
  p_message_id TEXT DEFAULT NULL,
  p_chat_id TEXT DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF p_status NOT IN ('posted', 'failed', 'scheduled', 'draft') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE public.telegram_posts
  SET status = p_status::post_status_enum,
      telegram_message_id = COALESCE(p_message_id, telegram_message_id),
      telegram_chat_id = COALESCE(p_chat_id, telegram_chat_id),
      posted_at = CASE WHEN p_status = 'posted' THEN now() ELSE posted_at END,
      error_message = CASE WHEN p_status = 'failed' THEN p_error
        WHEN p_status IN ('scheduled', 'draft') THEN COALESCE(p_error, error_message)
        ELSE NULL END,
      dispatch_started_at = CASE WHEN p_status = 'failed' THEN NULL ELSE dispatch_started_at END,
      lease_owner = CASE WHEN p_status IN ('scheduled', 'draft') THEN NULL ELSE lease_owner END,
      lease_expires_at = CASE WHEN p_status IN ('scheduled', 'draft') THEN NULL ELSE lease_expires_at END,
      claimed_at = CASE WHEN p_status IN ('scheduled', 'draft') THEN NULL ELSE claimed_at END
  WHERE id = p_id
    AND (p_worker_id IS NULL OR lease_owner = p_worker_id);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_telegram_story(
  p_story_id UUID,
  p_worker_id TEXT,
  p_status TEXT,
  p_message_id TEXT DEFAULT NULL,
  p_chat_id TEXT DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF p_status NOT IN ('posted', 'failed', 'scheduled', 'draft') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE public.telegram_stories
  SET status = p_status::story_status_enum,
      telegram_message_id = COALESCE(p_message_id, telegram_message_id),
      telegram_chat_id = COALESCE(p_chat_id, telegram_chat_id),
      posted_at = CASE WHEN p_status = 'posted' THEN now() ELSE posted_at END,
      error_message = CASE WHEN p_status = 'failed' THEN p_error
        WHEN p_status IN ('scheduled', 'draft') THEN COALESCE(p_error, error_message)
        ELSE NULL END,
      dispatch_started_at = CASE WHEN p_status = 'failed' THEN NULL ELSE dispatch_started_at END,
      lease_owner = CASE WHEN p_status IN ('scheduled', 'draft') THEN NULL ELSE lease_owner END,
      lease_expires_at = CASE WHEN p_status IN ('scheduled', 'draft') THEN NULL ELSE lease_expires_at END,
      claimed_at = CASE WHEN p_status IN ('scheduled', 'draft') THEN NULL ELSE claimed_at END
  WHERE story_id = p_story_id
    AND (p_worker_id IS NULL OR lease_owner = p_worker_id);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.recover_scheduler_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.scheduled_telegram_posts
  SET status = 'pending',
      lease_owner = NULL,
      lease_expires_at = NULL,
      updated_at = now()
  WHERE status = 'processing'
    AND (lease_expires_at IS NULL OR lease_expires_at < now())
    AND COALESCE(attempts, 0) < 3;

  UPDATE public.telegram_posts
  SET claimed_at = NULL,
      lease_owner = NULL,
      lease_expires_at = NULL
  WHERE status IN ('scheduled', 'draft')
    AND lease_expires_at IS NOT NULL
    AND lease_expires_at < now()
    AND COALESCE(attempts, 0) < 3
    AND dispatch_started_at IS NULL;

  UPDATE public.telegram_stories
  SET claimed_at = NULL,
      lease_owner = NULL,
      lease_expires_at = NULL
  WHERE status IN ('scheduled', 'draft')
    AND lease_expires_at IS NOT NULL
    AND lease_expires_at < now()
    AND COALESCE(attempts, 0) < 3
    AND dispatch_started_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_telegram_post_dispatch_started(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_telegram_story_dispatch_started(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_telegram_post_for_dispatch(UUID, UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_due_telegram_posts(UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_telegram_story_for_dispatch(UUID, UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_due_telegram_stories(UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_telegram_post(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_telegram_story(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recover_scheduler_jobs() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mark_telegram_post_dispatch_started(UUID, TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.mark_telegram_story_dispatch_started(UUID, TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.claim_telegram_post_for_dispatch(UUID, UUID, TEXT, BOOLEAN) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.claim_due_telegram_posts(UUID, INTEGER, TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.claim_telegram_story_for_dispatch(UUID, UUID, TEXT, BOOLEAN) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.claim_due_telegram_stories(UUID, INTEGER, TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.complete_telegram_post(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.complete_telegram_story(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.recover_scheduler_jobs() TO postgres, service_role;
