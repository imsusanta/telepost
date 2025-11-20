-- Create storage buckets for documents and story media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']),
  ('story-media', 'story-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']);

-- RLS Policies for documents bucket
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policies for story-media bucket
CREATE POLICY "Anyone can view public story media"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-media');

CREATE POLICY "Users can upload story media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'story-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own story media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'story-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own story media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'story-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create story_templates table FIRST (before telegram_stories that references it)
CREATE TABLE story_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    template_media_url TEXT,
    background_color TEXT,
    default_text_overlay JSONB DEFAULT '[]'::jsonb,
    default_stickers JSONB DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Now create telegram_stories table
CREATE TABLE telegram_stories (
    story_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    template_id UUID REFERENCES story_templates(id) ON DELETE SET NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    duration_seconds INTEGER DEFAULT 24 CHECK (duration_seconds BETWEEN 5 AND 60),
    background_color TEXT,
    text_overlay JSONB DEFAULT '[]'::jsonb,
    stickers JSONB DEFAULT '[]'::jsonb,
    caption TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posting', 'posted', 'failed', 'expired')),
    telegram_message_id TEXT,
    error_message TEXT,
    is_highlight BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement_rate NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create story_analytics table
CREATE TABLE story_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES telegram_stories(story_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'forward', 'reaction', 'reply')),
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_telegram_stories_user_id ON telegram_stories(user_id);
CREATE INDEX idx_telegram_stories_channel_id ON telegram_stories(channel_id);
CREATE INDEX idx_telegram_stories_status ON telegram_stories(status);
CREATE INDEX idx_telegram_stories_scheduled_time ON telegram_stories(scheduled_time) WHERE status = 'scheduled';
CREATE INDEX idx_telegram_stories_expires_at ON telegram_stories(expires_at) WHERE status = 'posted' AND is_highlight = FALSE;
CREATE INDEX idx_telegram_stories_created_at ON telegram_stories(created_at DESC);
CREATE INDEX idx_story_templates_category ON story_templates(category);
CREATE INDEX idx_story_templates_is_public ON story_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_story_analytics_story_id ON story_analytics(story_id);
CREATE INDEX idx_story_analytics_event_type ON story_analytics(event_type);

-- Enable RLS
ALTER TABLE telegram_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for telegram_stories
CREATE POLICY "Users can view their own stories"
    ON telegram_stories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stories"
    ON telegram_stories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
    ON telegram_stories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
    ON telegram_stories FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for story_templates
CREATE POLICY "Everyone can view public templates"
    ON story_templates FOR SELECT
    USING (is_public = TRUE OR created_by = auth.uid());

CREATE POLICY "Users can create their own templates"
    ON story_templates FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
    ON story_templates FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates"
    ON story_templates FOR DELETE
    USING (auth.uid() = created_by);

-- RLS Policies for story_analytics
CREATE POLICY "Users can view analytics for their stories"
    ON story_analytics FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM telegram_stories
        WHERE telegram_stories.story_id = story_analytics.story_id
        AND telegram_stories.user_id = auth.uid()
    ));

CREATE POLICY "System can insert analytics"
    ON story_analytics FOR INSERT
    WITH CHECK (true);

-- Create update triggers
CREATE TRIGGER update_telegram_stories_updated_at
    BEFORE UPDATE ON telegram_stories
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_story_templates_updated_at
    BEFORE UPDATE ON story_templates
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Create function to auto-set expires_at based on duration
CREATE OR REPLACE FUNCTION set_story_expires_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.posted_at IS NOT NULL AND NEW.is_highlight = FALSE THEN
        NEW.expires_at := NEW.posted_at + (COALESCE(NEW.duration_seconds, 24) || ' hours')::INTERVAL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_telegram_stories_expires_at
    BEFORE INSERT OR UPDATE ON telegram_stories
    FOR EACH ROW
    EXECUTE FUNCTION set_story_expires_at();

-- Insert default public templates
INSERT INTO story_templates (name, description, category, media_type, background_color, default_text_overlay, is_public, created_by) VALUES
('Quiz Announcement', 'Announce new quiz with bold text', 'quiz', 'image', '#FF6B6B', '[{"text":"New Quiz!","fontSize":48,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":40}}]', true, NULL),
('Daily Question', 'Daily trivia question template', 'quiz', 'image', '#4ECDC4', '[{"text":"Question of the Day","fontSize":36,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":30}}]', true, NULL),
('Results Share', 'Share quiz results with followers', 'results', 'image', '#95E1D3', '[{"text":"My Results","fontSize":42,"fontWeight":"bold","color":"#2C3E50","position":{"x":50,"y":35}}]', true, NULL),
('Coming Soon', 'Tease upcoming content', 'announcement', 'image', '#F38181', '[{"text":"Coming Soon...","fontSize":40,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":50}}]', true, NULL),
('Behind the Scenes', 'Show quiz creation process', 'engagement', 'image', '#AA96DA', '[{"text":"Behind the Scenes","fontSize":38,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":45}}]', true, NULL);

-- Grant permissions
GRANT ALL ON telegram_stories TO authenticated;
GRANT ALL ON story_templates TO authenticated;
GRANT ALL ON story_analytics TO authenticated;