-- ===========================================================================
-- RLS tenant isolation
-- Date: 2026-08-26
--
-- Findings this migration addresses:
--
--   1. scheduled_telegram_posts (20251114145658_...sql)
--        CREATE POLICY "Anyone can view scheduled posts"
--        ON public.scheduled_telegram_posts FOR SELECT USING (true);
--      plus an INSERT policy with WITH CHECK (true).
--      Any authenticated user could read every tenant's scheduled quiz
--      content and destination chat IDs, and insert rows attributed to
--      another user.
--
--   2. usage_tracking, subscriptions (20251124082442_...sql, 20251119010909_...sql)
--        CREATE POLICY "System can update usage" ... FOR UPDATE USING (true);
--        CREATE POLICY "System can update subscriptions" ... FOR UPDATE USING (true);
--      These were meant for the backend, but the backend uses the service role,
--      which bypasses RLS entirely. The policies only ever granted write access
--      to end users, letting anyone rewrite another user's quota or plan status.
--
-- Deliberately left public (they are meant to be): leaderboards,
-- system_features, classification_subjects, classification_topics,
-- subscription_plans.
--
-- Approach: for each table the existing policies are dropped and rebuilt, rather
-- than patched. These tables were re-policied by several overlapping migrations
-- and by the one-click repair scripts in supabase/*.sql, so the live policy set
-- cannot be predicted from the migration history alone. Dropping every policy is
-- safe for the backend because the service role bypasses RLS.
-- ===========================================================================

-- Helper: drop every policy on a table, if the table exists.
CREATE OR REPLACE FUNCTION public.reset_table_policies(p_table TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_policy RECORD;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = p_table
    ) THEN
        RAISE NOTICE 'Table public.% does not exist, skipping.', p_table;
        RETURN;
    END IF;

    FOR v_policy IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = p_table
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy.policyname, p_table);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. scheduled_telegram_posts  (quiz polls queued for delivery)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'scheduled_telegram_posts'
    ) THEN
        RETURN;
    END IF;

    PERFORM public.reset_table_policies('scheduled_telegram_posts');

    CREATE POLICY "Users read own scheduled posts"
        ON public.scheduled_telegram_posts FOR SELECT
        TO authenticated USING (auth.uid() = user_id);

    CREATE POLICY "Users insert own scheduled posts"
        ON public.scheduled_telegram_posts FOR INSERT
        TO authenticated WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users update own scheduled posts"
        ON public.scheduled_telegram_posts FOR UPDATE
        TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users delete own scheduled posts"
        ON public.scheduled_telegram_posts FOR DELETE
        TO authenticated USING (auth.uid() = user_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. telegram_posts  (text/image posts queued for delivery)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'telegram_posts'
    ) THEN
        RETURN;
    END IF;

    PERFORM public.reset_table_policies('telegram_posts');

    CREATE POLICY "Users read own telegram posts"
        ON public.telegram_posts FOR SELECT
        TO authenticated USING (auth.uid() = user_id);

    CREATE POLICY "Users insert own telegram posts"
        ON public.telegram_posts FOR INSERT
        TO authenticated WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users update own telegram posts"
        ON public.telegram_posts FOR UPDATE
        TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users delete own telegram posts"
        ON public.telegram_posts FOR DELETE
        TO authenticated USING (auth.uid() = user_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. usage_tracking  (quota counters)
--    Users may read their own row. All writes belong to the service role.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'usage_tracking'
    ) THEN
        RETURN;
    END IF;

    PERFORM public.reset_table_policies('usage_tracking');

    CREATE POLICY "Users read own usage"
        ON public.usage_tracking FOR SELECT
        TO authenticated USING (auth.uid() = user_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. subscriptions  (plan state)
--    Read-only for users. Writes belong to the service role / webhook.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) THEN
        RETURN;
    END IF;

    PERFORM public.reset_table_policies('subscriptions');

    CREATE POLICY "Users read own subscription"
        ON public.subscriptions FOR SELECT
        TO authenticated USING (auth.uid() = user_id);

    CREATE POLICY "Super admins read all subscriptions"
        ON public.subscriptions FOR SELECT
        TO authenticated USING (public.is_super_admin(auth.uid()));
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. subscription_payments  (order and payment ledger)
--    Read-only for users. Only the webhook (service role) may write.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'subscription_payments'
    ) THEN
        RETURN;
    END IF;

    PERFORM public.reset_table_policies('subscription_payments');

    CREATE POLICY "Users read own payments"
        ON public.subscription_payments FOR SELECT
        TO authenticated USING (auth.uid() = user_id);

    CREATE POLICY "Super admins read all payments"
        ON public.subscription_payments FOR SELECT
        TO authenticated USING (public.is_super_admin(auth.uid()));
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. profiles
--
--    NOTE: supabase/FORCE_ADMIN_SETUP.sql and supabase/ULTIMATE_DATA_REPAIR.sql
--    both install:
--        CREATE POLICY "Anyone can select" ON public.profiles FOR SELECT USING (true);
--    profiles holds email, telegram_bot_token and payment fields, so that policy
--    exposes every user's bot token to every logged-in user. Those scripts are not
--    migrations, so this only drops the policy by name -- the rest of the profiles
--    policy set is left alone, because a blanket rebuild here risks breaking the
--    admin dashboard and any UI that joins profiles for display names.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can select" ON public.profiles;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
    ) THEN
        CREATE POLICY "Users read own profile"
            ON public.profiles FOR SELECT
            TO authenticated USING (auth.uid() = id);

        CREATE POLICY "Super admins read all profiles"
            ON public.profiles FOR SELECT
            TO authenticated USING (public.is_super_admin(auth.uid()));
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.reset_table_policies(TEXT);

-- ===========================================================================
-- Verify after applying:
--
--   SELECT tablename, policyname, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename IN ('scheduled_telegram_posts','telegram_posts',
--                       'usage_tracking','subscriptions',
--                       'subscription_payments','profiles')
--   ORDER BY tablename, cmd;
--
-- Anything still showing qual = 'true' for SELECT/UPDATE/DELETE on a
-- tenant-owned table is a finding.
--
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' AND rowsecurity = false;
-- ===========================================================================
