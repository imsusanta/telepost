-- Add telegram_bot_token column to channels table if not exists
-- This enables per-user bot token storage for channel isolation

DO $$
BEGIN
    -- Add telegram_bot_token column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'channels' 
        AND column_name = 'telegram_bot_token'
    ) THEN
        ALTER TABLE public.channels ADD COLUMN telegram_bot_token TEXT;
        RAISE NOTICE 'Added telegram_bot_token column to channels table';
    ELSE
        RAISE NOTICE 'telegram_bot_token column already exists';
    END IF;
END $$;
