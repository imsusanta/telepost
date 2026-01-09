-- Step 1: Ensure 'text' value exists in enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'media_type_enum'::regtype 
        AND enumlabel = 'text'
    ) THEN
        ALTER TYPE media_type_enum ADD VALUE 'text';
    END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Step 2: Drop NOT NULL on media_url
DO $$
BEGIN
    ALTER TABLE public.telegram_stories ALTER COLUMN media_url DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Step 3: Drop auto-generated media_type check
DO $$
BEGIN
    ALTER TABLE public.telegram_stories DROP CONSTRAINT IF EXISTS telegram_stories_media_type_check;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Step 4: Fix valid_media constraint
DO $$
BEGIN
    ALTER TABLE public.telegram_stories DROP CONSTRAINT IF EXISTS valid_media;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE public.telegram_stories
ADD CONSTRAINT valid_media CHECK (
    (media_type = 'text' AND media_url IS NULL) OR
    (media_type IN ('image', 'video') AND media_url IS NOT NULL)
);