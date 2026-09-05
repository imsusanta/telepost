-- Rebuild tenant RLS with WITH CHECK + (select auth.uid()), and add
-- delivery uniqueness so a crash after Telegram accept cannot insert a
-- second row with the same chat/message id.
-- Additive. Does not rotate credentials or apply remotely by itself.

-- Helper: drop every policy on a table, if the table exists.
CREATE OR REPLACE FUNCTION public.reset_table_policies(p_table TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

REVOKE ALL ON FUNCTION public.reset_table_policies(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_table_policies(TEXT) TO postgres;

-- ---------------------------------------------------------------------------
-- Owner policies: SELECT/INSERT/UPDATE/DELETE with WITH CHECK so user_id
-- cannot be reassigned. (select auth.uid()) is evaluated once per query.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_table TEXT;
    v_has_super_admin BOOLEAN;
BEGIN
    v_has_super_admin := EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'is_super_admin'
    );

    FOREACH v_table IN ARRAY ARRAY['channels', 'documents', 'telegram_stories', 'telegram_posts', 'scheduled_telegram_posts']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = v_table
        ) THEN
            CONTINUE;
        END IF;

        PERFORM public.reset_table_policies(v_table);

        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id)',
            'Users read own ' || v_table, v_table
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id)',
            'Users insert own ' || v_table, v_table
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id)',
            'Users update own ' || v_table, v_table
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id)',
            'Users delete own ' || v_table, v_table
        );

        IF v_has_super_admin THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_super_admin((SELECT auth.uid())))',
                'Super admins read all ' || v_table, v_table
            );
        END IF;
    END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.reset_table_policies(TEXT);

-- ---------------------------------------------------------------------------
-- Delivery uniqueness (skip if historical duplicates already exist)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'telegram_posts'
      AND column_name = 'telegram_message_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'telegram_posts_telegram_delivery_uidx'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.telegram_posts
      WHERE telegram_chat_id IS NOT NULL AND telegram_message_id IS NOT NULL
      GROUP BY telegram_chat_id, telegram_message_id
      HAVING COUNT(*) > 1
    ) THEN
      RAISE WARNING 'Duplicate telegram_posts delivery ids exist; unique index was not created. Deduplicate before retrying.';
    ELSE
      CREATE UNIQUE INDEX telegram_posts_telegram_delivery_uidx
        ON public.telegram_posts (telegram_chat_id, telegram_message_id)
        WHERE telegram_chat_id IS NOT NULL AND telegram_message_id IS NOT NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'telegram_stories'
      AND column_name = 'telegram_message_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'telegram_stories_telegram_delivery_uidx'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.telegram_stories
      WHERE telegram_chat_id IS NOT NULL AND telegram_message_id IS NOT NULL
      GROUP BY telegram_chat_id, telegram_message_id
      HAVING COUNT(*) > 1
    ) THEN
      RAISE WARNING 'Duplicate telegram_stories delivery ids exist; unique index was not created. Deduplicate before retrying.';
    ELSE
      CREATE UNIQUE INDEX telegram_stories_telegram_delivery_uidx
        ON public.telegram_stories (telegram_chat_id, telegram_message_id)
        WHERE telegram_chat_id IS NOT NULL AND telegram_message_id IS NOT NULL;
    END IF;
  END IF;
END $$;
