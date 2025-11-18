-- Add user_id column to scheduled_telegram_posts table
-- This allows filtering posts by user and proper RLS policies

-- Add user_id column
ALTER TABLE public.scheduled_telegram_posts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for efficient user-based queries
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON public.scheduled_telegram_posts(user_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can schedule posts" ON public.scheduled_telegram_posts;
DROP POLICY IF EXISTS "Users can view their own posts" ON public.scheduled_telegram_posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.scheduled_telegram_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.scheduled_telegram_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.scheduled_telegram_posts;

-- Create new RLS policies for user-based access
CREATE POLICY "Users can view their own posts"
ON public.scheduled_telegram_posts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own posts"
ON public.scheduled_telegram_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
ON public.scheduled_telegram_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON public.scheduled_telegram_posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow service role full access for cron jobs
CREATE POLICY "Service role has full access"
ON public.scheduled_telegram_posts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON COLUMN public.scheduled_telegram_posts.user_id IS 'Reference to the user who created this scheduled post';
