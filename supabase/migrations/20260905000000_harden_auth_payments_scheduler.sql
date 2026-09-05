-- ============================================================================
-- Harden authorization, scheduler claiming, and payment finalization.
-- Additive only. Does not rotate or relocate service-role credentials.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Scheduler lease + per-message progress
-- ---------------------------------------------------------------------------
ALTER TABLE public.scheduled_telegram_posts
  ADD COLUMN IF NOT EXISTS lease_owner TEXT,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_progress JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.telegram_posts
  ADD COLUMN IF NOT EXISTS lease_owner TEXT,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;

ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS plan_billing_period TEXT,
  ADD COLUMN IF NOT EXISTS amount_paise INTEGER,
  ADD COLUMN IF NOT EXISTS currency TEXT;

-- currency already exists on some environments; the ADD COLUMN IF NOT EXISTS above
-- is a no-op there. Ensure a default for new rows.
ALTER TABLE public.subscription_payments
  ALTER COLUMN currency SET DEFAULT 'INR';

UPDATE public.subscription_payments
SET amount_paise = ROUND(amount * 100)::INTEGER
WHERE amount_paise IS NULL AND amount IS NOT NULL;

UPDATE public.subscription_payments sp
SET plan_billing_period = p.billing_period
FROM public.subscription_plans p
WHERE sp.plan_id = p.id
  AND sp.plan_billing_period IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'subscription_payments_razorpay_payment_id_uidx'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.subscription_payments
      WHERE razorpay_payment_id IS NOT NULL
      GROUP BY razorpay_payment_id
      HAVING COUNT(*) > 1
    ) THEN
      RAISE WARNING 'Duplicate razorpay_payment_id values exist; unique index was not created. Deduplicate before retrying.';
    ELSE
      CREATE UNIQUE INDEX subscription_payments_razorpay_payment_id_uidx
        ON public.subscription_payments (razorpay_payment_id)
        WHERE razorpay_payment_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Users must not insert/update payment rows themselves. Edge functions using
-- the service role write these records after server-side price resolution.
DROP POLICY IF EXISTS "Users can create own payment records" ON public.subscription_payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.subscription_payments;

-- ---------------------------------------------------------------------------
-- 2. system_config: keep credentials in place, tighten privileges.
--    Moving the service-role key out of this table requires a coordinated
--    pg_cron / vault cutover and is intentionally not done here.
-- ---------------------------------------------------------------------------
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.system_config FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.system_config TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.set_system_config(
  config_key TEXT,
  config_value TEXT,
  config_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF config_key IS NULL OR btrim(config_key) = '' THEN
    RAISE EXCEPTION 'config_key is required';
  END IF;
  INSERT INTO public.system_config (key, value, description, updated_at)
  VALUES (config_key, config_value, config_description, now())
  ON CONFLICT (key)
  DO UPDATE SET
    value = EXCLUDED.value,
    description = COALESCE(EXCLUDED.description, system_config.description),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_system_config(config_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  config_value TEXT;
BEGIN
  IF config_key IS NULL OR btrim(config_key) = '' THEN
    RETURN NULL;
  END IF;
  SELECT value INTO config_value
  FROM public.system_config
  WHERE key = config_key;
  RETURN config_value;
END;
$$;

REVOKE ALL ON FUNCTION public.get_system_config(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_system_config(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_config(TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.set_system_config(TEXT, TEXT, TEXT) TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- 3. Atomic scheduler claims (SKIP LOCKED). No select-then-update fallback.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.claim_due_scheduled_posts();
DROP FUNCTION IF EXISTS public.claim_due_scheduled_posts(uuid, integer, text);

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

DROP FUNCTION IF EXISTS public.claim_due_telegram_posts();

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
      lease_expires_at = now() + INTERVAL '8 minutes'
  WHERE target.id IN (
    SELECT t.id
    FROM public.telegram_posts t
    WHERE t.status = 'scheduled'
      AND t.scheduled_time <= now()
      AND COALESCE(t.attempts, 0) < 3
      AND (t.lease_expires_at IS NULL OR t.lease_expires_at < now())
      AND (p_user_id IS NULL OR t.user_id = p_user_id)
    ORDER BY t.scheduled_time ASC
    LIMIT v_limit
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
  IF p_id IS NULL OR p_worker_id IS NULL THEN
    RAISE EXCEPTION 'p_id and p_worker_id are required';
  END IF;

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

-- Recovery: only abandoned (expired) leases. Active workers are not stolen.
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
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_scheduled_posts(UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_scheduled_posts_by_ids(UUID[], UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_due_telegram_posts(UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_telegram_post_for_dispatch(UUID, UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_scheduled_post_progress(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_scheduled_post(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_telegram_post(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recover_scheduler_jobs() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_due_scheduled_posts(UUID, INTEGER, TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.claim_scheduled_posts_by_ids(UUID[], UUID, TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.claim_due_telegram_posts(UUID, INTEGER, TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.claim_telegram_post_for_dispatch(UUID, UUID, TEXT, BOOLEAN) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.record_scheduled_post_progress(UUID, TEXT, JSONB) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.complete_scheduled_post(UUID, TEXT, TEXT, TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.complete_telegram_post(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.recover_scheduler_jobs() TO postgres, service_role;

-- Post updates cannot reassign ownership.
DROP POLICY IF EXISTS "Users can update own posts" ON public.telegram_posts;
CREATE POLICY "Users can update own posts"
  ON public.telegram_posts
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 4. Atomic, idempotent payment finalization.
--    subscriptions.current_period_end is authoritative.
--    profiles.payment_expires_at / payment_status are mirrored for existing UI.
--    Duration comes from the order snapshot, else the purchased plan.
-- ---------------------------------------------------------------------------
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
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    updated_at
  )
  VALUES (
    v_payment.user_id,
    v_payment.plan_id,
    'active',
    v_start,
    v_end,
    FALSE,
    now()
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

REVOKE ALL ON FUNCTION public.billing_period_interval(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_razorpay_payment(TEXT, TEXT, UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_period_interval(TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_razorpay_payment(TEXT, TEXT, UUID, INTEGER, TEXT, TEXT, TEXT) TO postgres, service_role;

COMMENT ON FUNCTION public.finalize_razorpay_payment(TEXT, TEXT, UUID, INTEGER, TEXT, TEXT, TEXT) IS
  'Atomically records a captured Razorpay payment and applies plan-derived entitlement. Idempotent on payment/order replay.';

COMMENT ON FUNCTION public.claim_due_scheduled_posts(UUID, INTEGER, TEXT) IS
  'Atomically claims due scheduled quiz posts with SKIP LOCKED and a worker lease.';

COMMENT ON TABLE public.system_config IS
  'Internal scheduler configuration. May still contain a service-role key used by pg_cron; do not expose via Data API. Relocating it requires a dedicated vault/cron cutover.';
