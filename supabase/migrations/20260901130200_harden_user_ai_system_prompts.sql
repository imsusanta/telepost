-- Keep saved prompts bounded and ensure authenticated users can reach the
-- explicitly RLS-protected table through the Data API.
ALTER TABLE public.user_ai_system_prompts
  ALTER COLUMN system_prompt SET NOT NULL,
  ALTER COLUMN system_prompt SET DEFAULT '';

ALTER TABLE public.user_ai_system_prompts
  DROP CONSTRAINT IF EXISTS user_ai_system_prompts_length_check;

ALTER TABLE public.user_ai_system_prompts
  ADD CONSTRAINT user_ai_system_prompts_length_check
  CHECK (char_length(system_prompt) <= 6000);

DROP POLICY IF EXISTS "user_prompts_select_own" ON public.user_ai_system_prompts;
DROP POLICY IF EXISTS "user_prompts_insert_own" ON public.user_ai_system_prompts;
DROP POLICY IF EXISTS "user_prompts_update_own" ON public.user_ai_system_prompts;

CREATE POLICY "user_prompts_select_own" ON public.user_ai_system_prompts
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "user_prompts_insert_own" ON public.user_ai_system_prompts
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_prompts_update_own" ON public.user_ai_system_prompts
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE ON TABLE public.user_ai_system_prompts TO authenticated;
