-- Create dedicated telegram_posts table for channel posts
-- Separate from telegram_stories to avoid constraint conflicts

-- Create enum for post status
DO $$
BEGIN
    CREATE TYPE post_status_enum AS ENUM ('draft', 'scheduled', 'posted', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create telegram_posts table
CREATE TABLE IF NOT EXISTS public.telegram_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    
    -- Post content
    content TEXT NOT NULL, -- Text content of the post
    image_url TEXT, -- Optional image URL (NULL for text-only posts)
    
    -- Scheduling
    scheduled_time TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status post_status_enum DEFAULT 'draft',
    error_message TEXT,
    
    -- Telegram metadata
    telegram_message_id TEXT,
    telegram_chat_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_telegram_posts_user_id ON public.telegram_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_posts_channel_id ON public.telegram_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_telegram_posts_status ON public.telegram_posts(status);
CREATE INDEX IF NOT EXISTS idx_telegram_posts_scheduled_time ON public.telegram_posts(scheduled_time) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_telegram_posts_created_at ON public.telegram_posts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.telegram_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own posts
CREATE POLICY "Users can view own posts"
    ON public.telegram_posts FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own posts
CREATE POLICY "Users can insert own posts"
    ON public.telegram_posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
    ON public.telegram_posts FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
    ON public.telegram_posts FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER update_telegram_posts_updated_at
    BEFORE UPDATE ON public.telegram_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.telegram_posts TO authenticated;

-- Comments
COMMENT ON TABLE public.telegram_posts IS 'Telegram channel posts with text and optional images';
COMMENT ON COLUMN public.telegram_posts.content IS 'Text content of the post (required)';
COMMENT ON COLUMN public.telegram_posts.image_url IS 'Optional image URL for the post';
