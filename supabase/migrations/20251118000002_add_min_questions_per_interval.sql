-- Add min_questions_per_interval column to scheduled_telegram_posts table
-- This allows users to specify minimum number of questions per post interval

ALTER TABLE scheduled_telegram_posts
ADD COLUMN min_questions_per_interval INTEGER DEFAULT 1;

-- Add comment to explain the column
COMMENT ON COLUMN scheduled_telegram_posts.min_questions_per_interval IS 'Minimum number of questions to include in each post interval. Default is 1 (one question per interval). Users can set this to 5, 10, 15, or custom number to group multiple questions per scheduled post.';

-- Create index for queries that filter by this column
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_min_questions ON scheduled_telegram_posts(min_questions_per_interval);
