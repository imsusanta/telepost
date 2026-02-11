-- Add timezone column to auto_schedule_settings
ALTER TABLE auto_schedule_settings 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
