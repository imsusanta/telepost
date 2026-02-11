-- Add language column to auto_schedule_settings table
-- This allows users to specify the language for AI-generated quiz questions

ALTER TABLE auto_schedule_settings 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';

COMMENT ON COLUMN auto_schedule_settings.language IS 'Language for AI-generated quiz questions (e.g., English, Bengali, Hindi)';
