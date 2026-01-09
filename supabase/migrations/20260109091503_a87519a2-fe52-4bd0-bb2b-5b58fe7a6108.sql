-- Fix text-only posts
DO $$
BEGIN
    ALTER TABLE public.telegram_stories
    ALTER COLUMN media_url DROP NOT NULL;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'media_url is already nullable';
END $$;

-- Re-add the correct CHECK constraint
DO $$
BEGIN
    ALTER TABLE public.telegram_stories DROP CONSTRAINT IF EXISTS valid_media;
EXCEPTION
    WHEN others THEN NULL;
END $$;

ALTER TABLE public.telegram_stories
ADD CONSTRAINT valid_media CHECK (
    (media_type = 'text' AND media_url IS NULL) OR
    (media_type IN ('image', 'video') AND media_url IS NOT NULL)
);