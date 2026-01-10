-- Add channel_id column to scheduled_telegram_posts to allow per-channel bot token retrieval
-- This is essential for the process-scheduled-posts edge function to work correctly

-- 1. Add the column
ALTER TABLE public.scheduled_telegram_posts
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;

-- 2. Add description for clarity
COMMENT ON COLUMN public.scheduled_telegram_posts.channel_id IS 'Reference to the originating channel for bot token retrieval and ownership verification.';

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_channel_id ON public.scheduled_telegram_posts(channel_id);

-- 4. Update the Row Level Security policies to be extra safe
-- This ensures that users can only schedule for channels they own
-- (Though the column might be NULL for legacy reasons, new entries from the app will set it)
DROP POLICY IF EXISTS "Users can insert their own scheduled posts" ON public.scheduled_telegram_posts;
CREATE POLICY "Users can insert their own scheduled posts"
ON public.scheduled_telegram_posts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (
    channel_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.channels 
      WHERE id = channel_id AND user_id = auth.uid()
    )
  )
);
