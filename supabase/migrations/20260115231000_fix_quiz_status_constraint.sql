-- Add updated_at if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scheduled_telegram_posts' AND column_name = 'updated_at') THEN
        ALTER TABLE public.scheduled_telegram_posts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

ALTER TABLE public.scheduled_telegram_posts 
DROP CONSTRAINT IF EXISTS scheduled_telegram_posts_status_check;

ALTER TABLE public.scheduled_telegram_posts 
ADD CONSTRAINT scheduled_telegram_posts_status_check 
CHECK (status IN ('pending', 'processing', 'sent', 'failed'));

-- Verify and fix any stuck 'processing' posts from previous failed runs (if any)
UPDATE public.scheduled_telegram_posts 
SET status = 'pending' 
WHERE status = 'processing' AND updated_at < now() - INTERVAL '10 minutes';
