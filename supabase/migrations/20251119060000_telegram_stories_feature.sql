-- Telegram Stories Feature Migration
-- This migration adds support for creating and posting stories to Telegram channels

-- Create enum for media types
CREATE TYPE media_type_enum AS ENUM ('image', 'video', 'text');

-- Create enum for story status
CREATE TYPE story_status_enum AS ENUM ('draft', 'scheduled', 'posted', 'failed', 'expired', 'deleted');

-- Create telegram_stories table
CREATE TABLE telegram_stories (
    story_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,

    -- Story content
    media_type media_type_enum NOT NULL,
    media_url TEXT, -- URL to stored media file
    media_thumbnail_url TEXT, -- Thumbnail for video stories
    caption TEXT,

    -- Text overlay configuration (stored as JSONB)
    text_overlay JSONB DEFAULT '[]'::jsonb, -- Array of text elements with position, style, etc.

    -- Story styling
    background_color TEXT, -- For text-only stories
    template_id UUID, -- Reference to story template if used

    -- Stickers and emojis
    stickers JSONB DEFAULT '[]'::jsonb, -- Array of sticker/emoji data

    -- Scheduling and timing
    duration_hours INTEGER DEFAULT 24 CHECK (duration_hours > 0 AND duration_hours <= 168), -- Max 7 days
    scheduled_time TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Status tracking
    status story_status_enum DEFAULT 'draft',
    error_message TEXT,

    -- Analytics
    views_count INTEGER DEFAULT 0,
    interactions_count INTEGER DEFAULT 0,
    analytics_data JSONB DEFAULT '{}'::jsonb, -- Additional analytics data

    -- Telegram metadata
    telegram_message_id TEXT, -- Telegram's message ID after posting
    telegram_chat_id TEXT, -- The chat/channel where posted

    -- Highlight feature
    is_highlight BOOLEAN DEFAULT FALSE, -- If true, won't auto-delete
    highlight_order INTEGER, -- Order in highlights section

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_media CHECK (
        (media_type = 'text' AND media_url IS NULL) OR
        (media_type IN ('image', 'video') AND media_url IS NOT NULL)
    )
);

-- Create story_templates table
CREATE TABLE story_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- e.g., 'quiz', 'announcement', 'promotion'

    -- Template configuration
    media_type media_type_enum NOT NULL,
    background_color TEXT,
    background_image_url TEXT,

    -- Default text overlay styles
    default_text_overlay JSONB DEFAULT '[]'::jsonb,
    default_stickers JSONB DEFAULT '[]'::jsonb,

    -- Template preview
    preview_url TEXT,

    -- Visibility
    is_public BOOLEAN DEFAULT TRUE, -- Public templates available to all users
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create story_analytics table for detailed tracking
CREATE TABLE story_analytics (
    analytics_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES telegram_stories(story_id) ON DELETE CASCADE,

    -- Event tracking
    event_type TEXT NOT NULL, -- 'view', 'share', 'reaction', etc.
    event_data JSONB DEFAULT '{}'::jsonb,

    -- User/viewer information (if available)
    viewer_id TEXT, -- Telegram user ID if available
    viewer_username TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Index for fast queries
    CONSTRAINT valid_event_type CHECK (event_type IN ('view', 'share', 'reaction', 'click', 'forward'))
);

-- Create indexes for performance
CREATE INDEX idx_telegram_stories_user_id ON telegram_stories(user_id);
CREATE INDEX idx_telegram_stories_channel_id ON telegram_stories(channel_id);
CREATE INDEX idx_telegram_stories_status ON telegram_stories(status);
CREATE INDEX idx_telegram_stories_scheduled_time ON telegram_stories(scheduled_time) WHERE status = 'scheduled';
CREATE INDEX idx_telegram_stories_expires_at ON telegram_stories(expires_at) WHERE status = 'posted' AND is_highlight = FALSE;
CREATE INDEX idx_telegram_stories_created_at ON telegram_stories(created_at DESC);
CREATE INDEX idx_telegram_stories_is_highlight ON telegram_stories(is_highlight) WHERE is_highlight = TRUE;

CREATE INDEX idx_story_templates_category ON story_templates(category);
CREATE INDEX idx_story_templates_is_public ON story_templates(is_public) WHERE is_public = TRUE;

CREATE INDEX idx_story_analytics_story_id ON story_analytics(story_id);
CREATE INDEX idx_story_analytics_event_type ON story_analytics(event_type);
CREATE INDEX idx_story_analytics_created_at ON story_analytics(created_at DESC);

-- Enable Row Level Security
ALTER TABLE telegram_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for telegram_stories
-- Users can view their own stories
CREATE POLICY "Users can view own stories"
    ON telegram_stories FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own stories
CREATE POLICY "Users can insert own stories"
    ON telegram_stories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own stories
CREATE POLICY "Users can update own stories"
    ON telegram_stories FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own stories
CREATE POLICY "Users can delete own stories"
    ON telegram_stories FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for story_templates
-- Everyone can view public templates
CREATE POLICY "Anyone can view public templates"
    ON story_templates FOR SELECT
    USING (is_public = TRUE OR created_by = auth.uid());

-- Users can create their own templates
CREATE POLICY "Users can create own templates"
    ON story_templates FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
    ON story_templates FOR UPDATE
    USING (auth.uid() = created_by);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
    ON story_templates FOR DELETE
    USING (auth.uid() = created_by);

-- RLS Policies for story_analytics
-- Users can view analytics for their own stories
CREATE POLICY "Users can view own story analytics"
    ON story_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM telegram_stories
            WHERE telegram_stories.story_id = story_analytics.story_id
            AND telegram_stories.user_id = auth.uid()
        )
    );

-- System can insert analytics (edge functions will use service role)
CREATE POLICY "System can insert analytics"
    ON story_analytics FOR INSERT
    WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_telegram_stories_updated_at
    BEFORE UPDATE ON telegram_stories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_story_templates_updated_at
    BEFORE UPDATE ON story_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically set expires_at based on duration
CREATE OR REPLACE FUNCTION set_story_expires_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.posted_at IS NOT NULL AND NEW.expires_at IS NULL THEN
        NEW.expires_at = NEW.posted_at + (NEW.duration_hours || ' hours')::INTERVAL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for setting expires_at
CREATE TRIGGER set_telegram_stories_expires_at
    BEFORE INSERT OR UPDATE ON telegram_stories
    FOR EACH ROW
    EXECUTE FUNCTION set_story_expires_at();

-- Create function to process scheduled stories
CREATE OR REPLACE FUNCTION process_scheduled_stories()
RETURNS void AS $$
BEGIN
    -- This will be called by cron job to find and process scheduled stories
    -- The actual posting will be done by the edge function
    PERFORM story_id, user_id, channel_id, media_type, media_url, caption,
            text_overlay, stickers, duration_hours, telegram_chat_id
    FROM telegram_stories
    WHERE status = 'scheduled'
    AND scheduled_time <= NOW()
    ORDER BY scheduled_time ASC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to expire old stories
CREATE OR REPLACE FUNCTION expire_old_stories()
RETURNS void AS $$
BEGIN
    -- Mark stories as expired when they pass their expiration time
    UPDATE telegram_stories
    SET status = 'expired'
    WHERE status = 'posted'
    AND is_highlight = FALSE
    AND expires_at <= NOW();

    -- Note: Actual deletion from Telegram should be handled by edge function
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create cron job for processing scheduled stories (every minute)
SELECT cron.schedule(
    'process-scheduled-stories',
    '* * * * *', -- Every minute
    $$
    SELECT process_scheduled_stories();
    $$
);

-- Create cron job for expiring old stories (every 5 minutes)
SELECT cron.schedule(
    'expire-old-stories',
    '*/5 * * * *', -- Every 5 minutes
    $$
    SELECT expire_old_stories();
    $$
);

-- Insert some default story templates
INSERT INTO story_templates (name, description, category, media_type, background_color, default_text_overlay, is_public, created_by) VALUES
(
    'Quiz Announcement',
    'Template for announcing new quizzes',
    'quiz',
    'text',
    '#3B82F6',
    '[{"text":"New Quiz Available!","fontSize":48,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":30},"align":"center"},{"text":"Tap to participate","fontSize":24,"color":"#E0E7FF","position":{"x":50,"y":70},"align":"center"}]'::jsonb,
    TRUE,
    NULL
),
(
    'Quiz Results',
    'Template for sharing quiz results',
    'quiz',
    'text',
    '#10B981',
    '[{"text":"Quiz Completed!","fontSize":42,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":25},"align":"center"},{"text":"{{score}}","fontSize":64,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":50},"align":"center"},{"text":"Great job!","fontSize":28,"color":"#D1FAE5","position":{"x":50,"y":75},"align":"center"}]'::jsonb,
    TRUE,
    NULL
),
(
    'Promotional',
    'Template for promotional content',
    'promotion',
    'text',
    '#8B5CF6',
    '[{"text":"Special Offer","fontSize":36,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":35},"align":"center"},{"text":"Limited Time","fontSize":24,"color":"#EDE9FE","position":{"x":50,"y":65},"align":"center"}]'::jsonb,
    TRUE,
    NULL
),
(
    'Announcement',
    'Template for general announcements',
    'announcement',
    'text',
    '#F59E0B',
    '[{"text":"Announcement","fontSize":40,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":40},"align":"center"},{"text":"Stay tuned!","fontSize":26,"color":"#FEF3C7","position":{"x":50,"y":60},"align":"center"}]'::jsonb,
    TRUE,
    NULL
);

-- Add storage bucket for story media if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-media', 'story-media', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for story-media bucket
CREATE POLICY "Users can upload story media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'story-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view story media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'story-media');

CREATE POLICY "Users can update own story media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'story-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own story media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'story-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON telegram_stories TO authenticated;
GRANT ALL ON story_templates TO authenticated;
GRANT ALL ON story_analytics TO authenticated;

-- Comments for documentation
COMMENT ON TABLE telegram_stories IS 'Stores Telegram story posts with media, scheduling, and analytics';
COMMENT ON TABLE story_templates IS 'Predefined templates for quick story creation';
COMMENT ON TABLE story_analytics IS 'Detailed analytics tracking for story engagement';
COMMENT ON COLUMN telegram_stories.text_overlay IS 'JSONB array of text elements with styling and positioning';
COMMENT ON COLUMN telegram_stories.stickers IS 'JSONB array of sticker/emoji data with positioning';
COMMENT ON COLUMN telegram_stories.is_highlight IS 'If true, story is saved permanently and won''t auto-expire';
