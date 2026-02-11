-- =============================================
-- ULTRA-SAFE SYSTEM RECOVERY (BLOCK-BY-BLOCK)
-- =============================================

-- BLOCK 1: TYPES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type_enum') THEN
        CREATE TYPE media_type_enum AS ENUM ('image', 'video', 'text');
    END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Type media_type_enum already exists or failed: %', SQLERRM; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'story_status_enum') THEN
        CREATE TYPE story_status_enum AS ENUM ('draft', 'scheduled', 'posted', 'failed', 'expired', 'deleted');
    END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Type story_status_enum already exists or failed: %', SQLERRM; END $$;

-- BLOCK 2: SYSTEM SETTINGS
DO $$ BEGIN
    CREATE TABLE IF NOT EXISTS public.system_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key TEXT UNIQUE NOT NULL,
        setting_value JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Table system_settings failed: %', SQLERRM; END $$;

-- BLOCK 3: POSTS
DO $$ BEGIN
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
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Table telegram_posts failed: %', SQLERRM; END $$;

-- BLOCK 4: STORIES
DO $$ BEGIN
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
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Table telegram_stories failed: %', SQLERRM; END $$;

-- BLOCK 5: TEMPLATES
DO $$ BEGIN
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
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Table story_templates failed: %', SQLERRM; END $$;

-- BLOCK 6: SEED AI SETTINGS
DO $$ BEGIN
    INSERT INTO public.system_settings (setting_key, setting_value)
    VALUES ('ai_settings', '{"provider": "openrouter", "model": "openai/gpt-4o-mini", "temperature": 0.7}'::jsonb)
    ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Seed settings failed: %', SQLERRM; END $$;

-- BLOCK 7: SYNC PROFILES
DO $$ 
DECLARE u RECORD;
BEGIN
    FOR u IN (SELECT id, email, raw_user_meta_data FROM auth.users) LOOP
        BEGIN
            INSERT INTO public.profiles (id, email, full_name, role, approval_status)
            VALUES (u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', 'User'),
                CASE WHEN u.email IN ('susantalohr@gmail.com', 'susanta@sushantadigital.in') THEN 'super_admin' ELSE 'user' END,
                'approved')
            ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email,
                role = CASE WHEN EXCLUDED.email IN ('susantalohr@gmail.com', 'susanta@sushantadigital.in') THEN 'super_admin' ELSE public.profiles.role END,
                approval_status = 'approved';
        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Profile sync skip for %: %', u.email, SQLERRM; END;
    END LOOP;
END $$;

-- BLOCK 8: BILLING SYNC
DO $$ 
DECLARE u RECORD; v_plan_id UUID;
BEGIN
    SELECT id INTO v_plan_id FROM public.subscription_plans WHERE is_active = true ORDER BY (name = 'basic') DESC, price ASC LIMIT 1;
    IF v_plan_id IS NOT NULL THEN
        FOR u IN (SELECT id FROM public.profiles) LOOP
            BEGIN
                INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
                VALUES (u.id, v_plan_id, 'active', now(), now() + interval '100 years') ON CONFLICT (user_id) DO NOTHING;
                INSERT INTO public.usage_tracking (user_id) VALUES (u.id) ON CONFLICT (user_id) DO NOTHING;
            EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Billing sync skip for %: %', u.id, SQLERRM; END;
        END LOOP;
    END IF;
END $$;

-- BLOCK 9: BUCKETS
DO $$ BEGIN
    INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true) ON CONFLICT (id) DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('story-media', 'story-media', true) ON CONFLICT (id) DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Buckets creation failed: %', SQLERRM; END $$;

-- BLOCK 10: RLS POLICIES
DO $$ BEGIN
    ALTER TABLE public.telegram_posts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can manage own posts" ON public.telegram_posts;
    CREATE POLICY "Users can manage own posts" ON public.telegram_posts USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'RLS Posts failed: %', SQLERRM; END $$;

DO $$ BEGIN
    ALTER TABLE public.telegram_stories ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can manage own stories" ON public.telegram_stories;
    CREATE POLICY "Users can manage own stories" ON public.telegram_stories USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'RLS Stories failed: %', SQLERRM; END $$;

-- BLOCK 11: FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid DEFAULT auth.uid()) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND (role = 'super_admin' OR role = 'admin'));
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- BLOCK 12: PERMISSIONS
DO $$ BEGIN
    GRANT ALL ON public.telegram_posts TO authenticated;
    GRANT ALL ON public.telegram_stories TO authenticated;
    GRANT ALL ON public.story_templates TO authenticated;
    GRANT ALL ON public.system_settings TO authenticated;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Grants failed: %', SQLERRM; END $$;

-- FINAL STATUS
DO $$ BEGIN RAISE NOTICE '--- ULTRA-SAFE RECOVERY COMPLETE ---'; END $$;
