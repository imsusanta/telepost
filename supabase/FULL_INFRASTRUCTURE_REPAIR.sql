-- =============================================
-- FULL INFRASTRUCTURE REPAIR (TABLES & STORAGE)
-- =============================================

-- 1. ENUMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type_enum') THEN
        CREATE TYPE media_type_enum AS ENUM ('image', 'video', 'text');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'story_status_enum') THEN
        CREATE TYPE story_status_enum AS ENUM ('draft', 'scheduled', 'posted', 'failed', 'expired', 'deleted');
    END IF;
END $$;

-- 2. TELEGRAM POSTS TABLE
CREATE TABLE IF NOT EXISTS public.telegram_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted', 'failed')),
    scheduled_time TIMESTAMPTZ,
    posted_at TIMESTAMPTZ,
    telegram_message_id TEXT,
    telegram_chat_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TELEGRAM STORIES TABLE
CREATE TABLE IF NOT EXISTS public.telegram_stories (
    story_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    media_type media_type_enum NOT NULL,
    media_url TEXT,
    media_thumbnail_url TEXT,
    caption TEXT,
    text_overlay JSONB DEFAULT '[]'::jsonb,
    background_color TEXT,
    template_id UUID,
    stickers JSONB DEFAULT '[]'::jsonb,
    duration_hours INTEGER DEFAULT 24,
    scheduled_time TIMESTAMPTZ,
    posted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    status story_status_enum DEFAULT 'draft',
    error_message TEXT,
    views_count INTEGER DEFAULT 0,
    interactions_count INTEGER DEFAULT 0,
    analytics_data JSONB DEFAULT '{}'::jsonb,
    telegram_message_id TEXT,
    telegram_chat_id TEXT,
    is_highlight BOOLEAN DEFAULT FALSE,
    highlight_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. STORY TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.story_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    media_type media_type_enum NOT NULL,
    background_color TEXT,
    background_image_url TEXT,
    default_text_overlay JSONB DEFAULT '[]'::jsonb,
    default_stickers JSONB DEFAULT '[]'::jsonb,
    preview_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('post-media', 'post-media', true),
    ('story-media', 'story-media', true),
    ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 6. STORAGE POLICIES (BASIC)
DO $$ 
BEGIN
    -- Only create if not exists (using a simple check)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects') THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('post-media', 'story-media', 'documents'));
        CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('post-media', 'story-media', 'documents') AND auth.role() = 'authenticated');
    END IF;
END $$;

-- 7. RLS POLICIES FOR NEW TABLES
ALTER TABLE public.telegram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own posts" ON public.telegram_posts;
CREATE POLICY "Users can manage own posts" ON public.telegram_posts USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own stories" ON public.telegram_stories;
CREATE POLICY "Users can manage own stories" ON public.telegram_stories USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Templates visible to all" ON public.story_templates;
CREATE POLICY "Templates visible to all" ON public.story_templates FOR SELECT USING (is_public = true OR auth.uid() = created_by);

-- 8. TRIGGER FOR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_posts_updated_at ON public.telegram_posts;
CREATE TRIGGER tr_update_posts_updated_at BEFORE UPDATE ON public.telegram_posts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_stories_updated_at ON public.telegram_stories;
CREATE TRIGGER tr_update_stories_updated_at BEFORE UPDATE ON public.telegram_stories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- FINAL REPORT
DO $$ 
BEGIN 
    RAISE NOTICE '--- INFRASTRUCTURE READY ---';
    RAISE NOTICE 'Tables created: telegram_posts, telegram_stories, story_templates';
    RAISE NOTICE 'Buckets created: post-media, story-media, documents';
END $$;
