-- Make user_id NOT NULL now that orphaned records are cleaned up
ALTER TABLE public.scheduled_telegram_posts 
ALTER COLUMN user_id SET NOT NULL;

-- Ensure proper RLS policy exists (drop any old permissive ones first)
DROP POLICY IF EXISTS "Anyone can schedule posts" ON public.scheduled_telegram_posts;
DROP POLICY IF EXISTS "Anyone can view scheduled posts" ON public.scheduled_telegram_posts;

-- The "Users manage own scheduled posts" policy should already exist, but ensure it's correct
DROP POLICY IF EXISTS "Users manage own scheduled posts" ON public.scheduled_telegram_posts;
CREATE POLICY "Users manage own scheduled posts" ON public.scheduled_telegram_posts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);