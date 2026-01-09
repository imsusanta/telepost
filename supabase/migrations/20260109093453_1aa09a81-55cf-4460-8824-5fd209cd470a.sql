-- Create post status enum
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
    content TEXT NOT NULL,
    image_url TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,
    status post_status_enum DEFAULT 'draft',
    error_message TEXT,
    telegram_message_id TEXT,
    telegram_chat_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.telegram_posts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own posts" ON public.telegram_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own posts" ON public.telegram_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.telegram_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.telegram_posts FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.telegram_posts TO authenticated;