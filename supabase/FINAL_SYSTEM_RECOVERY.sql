-- =============================================
-- FINAL SYSTEM RECOVERY (THE ONE-CLICK FIX)
-- =============================================
-- This script fixes: 
-- 1. Missing Tables (Posts, Stories, Settings)
-- 2. Missing Storage Buckets
-- 3. Missing Subscriptions/Billing
-- 4. Admin Roles & Profile Sync
-- 5. AI Settings Seeding

-- 1. TABLES & ENUMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type_enum') THEN
        CREATE TYPE media_type_enum AS ENUM ('image', 'video', 'text');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'story_status_enum') THEN
        CREATE TYPE story_status_enum AS ENUM ('draft', 'scheduled', 'posted', 'failed', 'expired', 'deleted');
    END IF;
END $$;

-- 2. CORE TABLES
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

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

-- 3. SEEDING SETTINGS
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('ai_settings', '{"provider": "openrouter", "model": "openai/gpt-4o-mini", "temperature": 0.7}'::jsonb)
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- 4. PROFILE & ROLE SYNC (Ensuring Admin Status)
DO $$ 
DECLARE
    u RECORD;
BEGIN
    FOR u IN (SELECT id, email, raw_user_meta_data FROM auth.users) LOOP
        BEGIN
            INSERT INTO public.profiles (id, email, full_name, role, approval_status)
            VALUES (
                u.id, 
                u.email, 
                COALESCE(u.raw_user_meta_data->>'full_name', 'User'),
                CASE 
                    WHEN u.email IN ('susantalohr@gmail.com', 'susanta@sushantadigital.in') THEN 'super_admin' 
                    ELSE 'user' 
                END,
                'approved'
            )
            ON CONFLICT (id) DO UPDATE SET 
                email = EXCLUDED.email,
                role = CASE 
                    WHEN EXCLUDED.email IN ('susantalohr@gmail.com', 'susanta@sushantadigital.in') THEN 'super_admin' 
                    ELSE public.profiles.role 
                END,
                approval_status = 'approved';
        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Profile sync skip: %', u.email;
        END;
    END LOOP;
END $$;

-- 5. BILLING SYNC
DO $$ 
DECLARE
    u RECORD;
    v_plan_id UUID;
BEGIN
    SELECT id INTO v_plan_id FROM public.subscription_plans WHERE is_active = true ORDER BY (name = 'basic') DESC, price ASC LIMIT 1;
    IF v_plan_id IS NOT NULL THEN
        FOR u IN (SELECT id FROM public.profiles) LOOP
            INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
            VALUES (u.id, v_plan_id, 'active', now(), now() + interval '100 years') ON CONFLICT (user_id) DO NOTHING;
            INSERT INTO public.usage_tracking (user_id) VALUES (u.id) ON CONFLICT (user_id) DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- 6. STORAGE INFRASTRUCTURE
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true), ('story-media', 'story-media', true), ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects') THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('post-media', 'story-media', 'documents'));
        CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('post-media', 'story-media', 'documents') AND auth.role() = 'authenticated');
    END IF;
END $$;

-- 7. ESSENTIAL FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid DEFAULT auth.uid()) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND (role = 'super_admin' OR role = 'admin'));
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. GRANT PERMISSIONS
GRANT ALL ON public.telegram_posts TO authenticated;
GRANT ALL ON public.telegram_stories TO authenticated;
GRANT ALL ON public.story_templates TO authenticated;
GRANT ALL ON public.system_settings TO authenticated;

-- FINAL NOTICE
DO $$ BEGIN RAISE NOTICE '--- SYSTEM RECOVERY COMPLETE ---'; END $$;
