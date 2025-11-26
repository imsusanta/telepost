-- Add min_questions_per_interval column to scheduled_telegram_posts table
ALTER TABLE scheduled_telegram_posts 
ADD COLUMN IF NOT EXISTS min_questions_per_interval INTEGER DEFAULT 1;