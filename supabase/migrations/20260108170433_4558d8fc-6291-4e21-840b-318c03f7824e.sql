-- Add telegram_bot_token column to channels table
ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT;