CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS public.subscription_payments CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.telegram_stories CASCADE;
DROP TABLE IF EXISTS public.telegram_posts CASCADE;
DROP TABLE IF EXISTS public.scheduled_telegram_posts CASCADE;
DROP TABLE IF EXISTS public.channels CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.system_config CASCADE;
DROP TYPE IF EXISTS post_status_enum;

CREATE TYPE post_status_enum AS ENUM ('draft', 'scheduled', 'posted', 'failed');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  payment_expires_at TIMESTAMPTZ
);

CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  price NUMERIC NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  amount NUMERIC NOT NULL,
  amount_paise INTEGER,
  plan_billing_period TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded', 'underpaid')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX subscription_payments_razorpay_payment_id_uidx
  ON public.subscription_payments (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  telegram_channel_id TEXT,
  telegram_bot_token TEXT,
  name TEXT
);

CREATE TABLE public.telegram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  scheduled_time TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  status post_status_enum DEFAULT 'draft',
  error_message TEXT,
  telegram_message_id TEXT,
  telegram_chat_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ,
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.telegram_stories (
  story_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  caption TEXT,
  text_overlay JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  error_message TEXT,
  telegram_message_id TEXT,
  telegram_chat_id TEXT,
  scheduled_time TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ,
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ
);

CREATE TABLE public.scheduled_telegram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  quiz_data JSONB NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  delivery_progress JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.billing_period_interval(p_period TEXT)
RETURNS INTERVAL
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN lower(COALESCE(p_period, 'monthly')) IN ('yearly', 'year', 'annual') THEN INTERVAL '1 year'
    WHEN lower(COALESCE(p_period, 'monthly')) = 'trial' THEN INTERVAL '7 days'
    ELSE INTERVAL '1 month'
  END;
$$;

CREATE OR REPLACE FUNCTION public.claim_due_scheduled_posts(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 5,
  p_worker_id TEXT DEFAULT NULL
)
RETURNS SETOF public.scheduled_telegram_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 10);
  v_worker TEXT := COALESCE(NULLIF(p_worker_id, ''), 'worker-' || gen_random_uuid()::text);
BEGIN
  RETURN QUERY
  UPDATE public.scheduled_telegram_posts AS target
  SET status = 'processing',
      attempts = COALESCE(target.attempts, 0) + 1,
      lease_owner = v_worker,
      lease_expires_at = now() + INTERVAL '8 minutes',
      updated_at = now()
  WHERE target.id IN (
    SELECT s.id
    FROM public.scheduled_telegram_posts s
    WHERE s.status = 'pending'
      AND s.scheduled_time <= now()
      AND COALESCE(s.attempts, 0) < 3
      AND (p_user_id IS NULL OR s.user_id = p_user_id)
    ORDER BY s.scheduled_time ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING target.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_scheduled_posts_by_ids(
  p_ids UUID[],
  p_user_id UUID,
  p_worker_id TEXT DEFAULT NULL
)
RETURNS SETOF public.scheduled_telegram_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_worker TEXT := COALESCE(NULLIF(p_worker_id, ''), 'worker-' || gen_random_uuid()::text);
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.scheduled_telegram_posts AS target
  SET status = 'processing',
      attempts = COALESCE(target.attempts, 0) + 1,
      lease_owner = v_worker,
      lease_expires_at = now() + INTERVAL '8 minutes',
      updated_at = now()
  WHERE target.id IN (
    SELECT s.id
    FROM public.scheduled_telegram_posts s
    WHERE s.id = ANY (p_ids)
      AND s.user_id = p_user_id
      AND s.status = 'pending'
      AND COALESCE(s.attempts, 0) < 3
    ORDER BY s.scheduled_time ASC
    LIMIT 10
    FOR UPDATE SKIP LOCKED
  )
  RETURNING target.*;
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
  RETURN QUERY
  UPDATE public.telegram_posts AS target
  SET claimed_at = now(),
      attempts = COALESCE(target.attempts, 0) + 1,
      lease_owner = v_worker,
      lease_expires_at = now() + INTERVAL '8 minutes',
      error_message = NULL
  WHERE target.id = p_post_id
    AND target.telegram_message_id IS NULL
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

CREATE OR REPLACE FUNCTION public.record_scheduled_post_progress(
  p_id UUID,
  p_worker_id TEXT,
  p_progress JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.scheduled_telegram_posts
  SET delivery_progress = COALESCE(p_progress, '{}'::jsonb),
      updated_at = now(),
      lease_expires_at = now() + INTERVAL '8 minutes'
  WHERE id = p_id
    AND lease_owner = p_worker_id
    AND status = 'processing';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_scheduled_post(
  p_id UUID,
  p_worker_id TEXT,
  p_status TEXT,
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
  IF p_status NOT IN ('sent', 'failed', 'pending') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  UPDATE public.scheduled_telegram_posts
  SET status = p_status,
      error_message = CASE WHEN p_status = 'failed' THEN p_error ELSE NULL END,
      sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE sent_at END,
      lease_owner = CASE WHEN p_status = 'pending' THEN NULL ELSE lease_owner END,
      lease_expires_at = CASE WHEN p_status = 'pending' THEN NULL ELSE lease_expires_at END,
      updated_at = now()
  WHERE id = p_id
    AND lease_owner = p_worker_id
    AND status = 'processing';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
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
      error_message = CASE WHEN p_status = 'failed' THEN p_error ELSE NULL END,
      lease_owner = CASE WHEN p_status IN ('scheduled', 'draft') THEN NULL ELSE lease_owner END,
      lease_expires_at = CASE WHEN p_status IN ('scheduled', 'draft') THEN NULL ELSE lease_expires_at END,
      claimed_at = CASE WHEN p_status IN ('scheduled', 'draft') THEN NULL ELSE claimed_at END
  WHERE id = p_id
    AND (p_worker_id IS NULL OR lease_owner = p_worker_id);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
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
  RETURN QUERY
  UPDATE public.telegram_stories AS target
  SET claimed_at = now(),
      attempts = COALESCE(target.attempts, 0) + 1,
      lease_owner = v_worker,
      lease_expires_at = now() + INTERVAL '8 minutes',
      error_message = NULL
  WHERE target.story_id = p_story_id
    AND target.telegram_message_id IS NULL
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
  SET status = p_status,
      telegram_message_id = COALESCE(p_message_id, telegram_message_id),
      telegram_chat_id = COALESCE(p_chat_id, telegram_chat_id),
      posted_at = CASE WHEN p_status = 'posted' THEN now() ELSE posted_at END,
      error_message = CASE WHEN p_status = 'failed' THEN p_error ELSE NULL END,
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
    AND COALESCE(attempts, 0) < 3;

  UPDATE public.telegram_stories
  SET claimed_at = NULL,
      lease_owner = NULL,
      lease_expires_at = NULL
  WHERE status IN ('scheduled', 'draft')
    AND lease_expires_at IS NOT NULL
    AND lease_expires_at < now()
    AND COALESCE(attempts, 0) < 3;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_razorpay_payment(
  p_order_id TEXT,
  p_payment_id TEXT,
  p_user_id UUID,
  p_paid_paise INTEGER,
  p_currency TEXT,
  p_provider_status TEXT,
  p_signature TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.subscription_payments%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_sub public.subscriptions%ROWTYPE;
  v_expected_paise INTEGER;
  v_period TEXT;
  v_interval INTERVAL;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_already BOOLEAN := FALSE;
BEGIN
  IF p_order_id IS NULL OR btrim(p_order_id) = '' THEN
    RAISE EXCEPTION 'order id is required';
  END IF;
  IF p_payment_id IS NULL OR btrim(p_payment_id) = '' THEN
    RAISE EXCEPTION 'payment id is required';
  END IF;
  IF lower(COALESCE(p_provider_status, '')) <> 'captured' THEN
    RAISE EXCEPTION 'payment is not captured';
  END IF;
  IF upper(COALESCE(p_currency, '')) <> 'INR' THEN
    RAISE EXCEPTION 'currency mismatch';
  END IF;

  SELECT * INTO v_payment
  FROM public.subscription_payments
  WHERE razorpay_order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found';
  END IF;

  IF p_user_id IS NOT NULL AND v_payment.user_id <> p_user_id THEN
    RAISE EXCEPTION 'order ownership mismatch';
  END IF;

  v_expected_paise := COALESCE(v_payment.amount_paise, ROUND(v_payment.amount * 100)::INTEGER);
  IF v_expected_paise IS NULL OR p_paid_paise IS NULL OR p_paid_paise <> v_expected_paise THEN
    UPDATE public.subscription_payments
    SET payment_status = 'underpaid',
        razorpay_payment_id = COALESCE(razorpay_payment_id, p_payment_id),
        description = COALESCE(description, '') || ' [underpaid]'
    WHERE id = v_payment.id
      AND payment_status <> 'success';
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'amount mismatch',
      'user_id', v_payment.user_id
    );
  END IF;

  IF v_payment.payment_status = 'success' THEN
    IF v_payment.razorpay_payment_id IS NOT NULL
       AND v_payment.razorpay_payment_id <> p_payment_id THEN
      RAISE EXCEPTION 'order already paid with a different payment';
    END IF;
    v_already := TRUE;
    SELECT * INTO v_sub FROM public.subscriptions WHERE user_id = v_payment.user_id;
    RETURN jsonb_build_object(
      'success', TRUE,
      'already_finalized', TRUE,
      'user_id', v_payment.user_id,
      'plan_id', v_payment.plan_id,
      'period_end', v_sub.current_period_end
    );
  END IF;

  IF v_payment.plan_id IS NOT NULL THEN
    SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_payment.plan_id;
  END IF;

  v_period := COALESCE(v_payment.plan_billing_period, v_plan.billing_period, 'monthly');
  v_interval := public.billing_period_interval(v_period);

  SELECT * INTO v_sub FROM public.subscriptions WHERE user_id = v_payment.user_id FOR UPDATE;

  IF v_sub.id IS NOT NULL
     AND v_sub.status = 'active'
     AND v_sub.current_period_end IS NOT NULL
     AND v_sub.current_period_end > now() THEN
    v_start := v_sub.current_period_start;
    v_end := v_sub.current_period_end + v_interval;
  ELSE
    v_start := now();
    v_end := now() + v_interval;
  END IF;

  UPDATE public.subscription_payments
  SET razorpay_payment_id = p_payment_id,
      razorpay_signature = COALESCE(p_signature, razorpay_signature),
      payment_status = 'success',
      completed_at = now(),
      currency = 'INR'
  WHERE id = v_payment.id;

  INSERT INTO public.subscriptions (
    user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, updated_at
  )
  VALUES (
    v_payment.user_id, v_payment.plan_id, 'active', v_start, v_end, FALSE, now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET plan_id = EXCLUDED.plan_id,
      status = 'active',
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = FALSE,
      updated_at = now();

  UPDATE public.profiles
  SET payment_status = 'paid',
      razorpay_payment_id = p_payment_id,
      razorpay_order_id = p_order_id,
      payment_expires_at = v_end
  WHERE id = v_payment.user_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'already_finalized', v_already,
    'user_id', v_payment.user_id,
    'plan_id', v_payment.plan_id,
    'billing_period', v_period,
    'period_start', v_start,
    'period_end', v_end
  );
END;
$$;
