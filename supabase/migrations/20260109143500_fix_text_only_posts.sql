-- Comprehensive fix for telegram_stories table to allow text-only posts
-- Fixes: media_type enum and media_url NULL constraint issues

-- Step 1: Ensure media_type_enum has 'text' value
DO $$
BEGIN
    -- Check if 'text' value exists in the enum, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'media_type_enum'::regtype 
        AND enumlabel = 'text'
    ) THEN
        ALTER TYPE media_type_enum ADD VALUE 'text';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'media_type_enum already has text value or enum does not exist';
END $$;

-- Step 2: Drop media_url NOT NULL constraint if exists
DO $$
BEGIN
    ALTER TABLE public.telegram_stories
    ALTER COLUMN media_url DROP NOT NULL;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'media_url is already nullable';
END $$;

-- Step 3: Drop any existing valid_media constraint
DO $$
BEGIN
    ALTER TABLE public.telegram_stories DROP CONSTRAINT IF EXISTS valid_media;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Step 4: Re-add the correct valid_media constraint
-- This allows NULL media_url ONLY for text type posts
ALTER TABLE public.telegram_stories
ADD CONSTRAINT valid_media CHECK (
    (media_type = 'text' AND media_url IS NULL) OR
    (media_type IN ('image', 'video') AND media_url IS NOT NULL)
);

-- Step 5: If media_type column uses a CHECK constraint instead of enum,
-- we need to ensure 'text' is allowed
DO $$
BEGIN
    -- Try to drop any auto-generated check constraint on media_type
    ALTER TABLE public.telegram_stories DROP CONSTRAINT IF EXISTS telegram_stories_media_type_check;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Comment for documentation
COMMENT ON COLUMN public.telegram_stories.media_url IS 'URL to stored media file. NULL for text-only posts.';
COMMENT ON COLUMN public.telegram_stories.media_type IS 'Type of media: image, video, or text. Text type allows NULL media_url.';
