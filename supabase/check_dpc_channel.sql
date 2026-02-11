-- Run this in Supabase SQL Editor to check DPC channel configuration

-- Check the DPC channel details
SELECT 
    id,
    name,
    telegram_channel_id,
    telegram_bot_token,
    user_id,
    settings
FROM channels 
WHERE name = 'DPC' OR id = '186f4c7b-1155-4e3e-bbee-d9d5b8248327';

-- Check if bot token is valid (should start with numbers:letters pattern)
-- Example valid token: 1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ

-- For 404 error, these are the possible issues:
-- 1. telegram_channel_id is wrong or doesn't exist
-- 2. telegram_bot_token is invalid or expired
-- 3. Bot is not added to the channel as admin

-- To get correct chat ID from Telegram:
-- 1. Add @RawDataBot to your channel
-- 2. It will send you the chat_id
-- 3. Use that ID (including the - prefix if present)

-- Example: if RawDataBot shows "-1001234567890", use exactly that
