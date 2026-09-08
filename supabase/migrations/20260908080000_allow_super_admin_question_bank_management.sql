-- Super admin policies for question_banks
-- Enables Super Admins to view, insert, update, and delete all questions in public.question_banks

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'question_banks'
    ) THEN
        DROP POLICY IF EXISTS "Super admins can view all question banks" ON public.question_banks;
        CREATE POLICY "Super admins can view all question banks"
        ON public.question_banks FOR SELECT
        TO authenticated
        USING (public.is_super_admin((SELECT auth.uid())));

        DROP POLICY IF EXISTS "Super admins can insert question banks" ON public.question_banks;
        CREATE POLICY "Super admins can insert question banks"
        ON public.question_banks FOR INSERT
        TO authenticated
        WITH CHECK (public.is_super_admin((SELECT auth.uid())));

        DROP POLICY IF EXISTS "Super admins can update all question banks" ON public.question_banks;
        CREATE POLICY "Super admins can update all question banks"
        ON public.question_banks FOR UPDATE
        TO authenticated
        USING (public.is_super_admin((SELECT auth.uid())))
        WITH CHECK (public.is_super_admin((SELECT auth.uid())));

        DROP POLICY IF EXISTS "Super admins can delete all question banks" ON public.question_banks;
        CREATE POLICY "Super admins can delete all question banks"
        ON public.question_banks FOR DELETE
        TO authenticated
        USING (public.is_super_admin((SELECT auth.uid())));
    END IF;
END;
$$;
