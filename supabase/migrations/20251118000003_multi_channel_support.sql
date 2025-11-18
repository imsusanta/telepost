-- =============================================
-- MULTI-CHANNEL SUPPORT MIGRATION
-- =============================================
-- This migration adds support for multiple Telegram channels per user
-- and integrates channels with documents and question banks

-- ============================================
-- 1. CREATE TELEGRAM_CHANNELS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.telegram_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Channel info
  channel_name TEXT NOT NULL, -- User-friendly name for the channel
  telegram_bot_token TEXT NOT NULL,
  telegram_channel_id TEXT NOT NULL, -- Chat ID or @channel_username

  -- Channel metadata
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false, -- Default channel for quick sharing

  -- Channel settings
  auto_post_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_post_time TIME, -- Time of day to auto-post (if scheduled)

  -- Statistics
  total_quizzes_sent INTEGER NOT NULL DEFAULT 0,
  last_quiz_sent_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Ensure unique channel IDs per user
  UNIQUE(user_id, telegram_channel_id)
);

CREATE INDEX idx_telegram_channels_user_id ON public.telegram_channels(user_id);
CREATE INDEX idx_telegram_channels_active ON public.telegram_channels(is_active) WHERE is_active = true;

-- ============================================
-- 2. LINK DOCUMENTS TO CHANNELS
-- ============================================

-- Add optional channel_id to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.telegram_channels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_channel_id ON public.documents(channel_id);

-- ============================================
-- 3. LINK QUESTION BANKS TO CHANNELS
-- ============================================

-- Add optional channel_id to question_banks table
ALTER TABLE public.question_banks
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.telegram_channels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_question_banks_channel_id ON public.question_banks(channel_id);

-- ============================================
-- 4. UPDATE QUIZ_GENERATIONS TABLE
-- ============================================

-- Add channel_id to quiz_generations table
ALTER TABLE public.quiz_generations
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.telegram_channels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_generations_channel_id ON public.quiz_generations(channel_id);

-- ============================================
-- 5. UPDATE SCHEDULED_TELEGRAM_POSTS TABLE
-- ============================================

-- Add channel_id to scheduled_telegram_posts table
ALTER TABLE public.scheduled_telegram_posts
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.telegram_channels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_channel_id ON public.scheduled_telegram_posts(channel_id);

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on telegram_channels
ALTER TABLE public.telegram_channels ENABLE ROW LEVEL SECURITY;

-- Users can view their own channels
CREATE POLICY "Users can view their own channels"
ON public.telegram_channels FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own channels
CREATE POLICY "Users can insert their own channels"
ON public.telegram_channels FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own channels
CREATE POLICY "Users can update their own channels"
ON public.telegram_channels FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own channels
CREATE POLICY "Users can delete their own channels"
ON public.telegram_channels FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Add updated_at trigger for telegram_channels
CREATE TRIGGER update_telegram_channels_updated_at
BEFORE UPDATE ON public.telegram_channels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one default channel per user
CREATE OR REPLACE FUNCTION ensure_single_default_channel()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this channel as default, unset all other default channels for this user
  IF NEW.is_default = true THEN
    UPDATE public.telegram_channels
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one default channel
CREATE TRIGGER ensure_single_default_channel_trigger
BEFORE INSERT OR UPDATE ON public.telegram_channels
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION ensure_single_default_channel();

-- ============================================
-- 8. DATA MIGRATION FROM PROFILES
-- ============================================

-- Migrate existing telegram channel data from profiles to telegram_channels
INSERT INTO public.telegram_channels (user_id, channel_name, telegram_bot_token, telegram_channel_id, is_default, is_active)
SELECT
  id as user_id,
  'My Channel' as channel_name,
  telegram_bot_token,
  telegram_channel_id,
  true as is_default,
  true as is_active
FROM public.profiles
WHERE telegram_bot_token IS NOT NULL
  AND telegram_channel_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.telegram_channels tc
    WHERE tc.user_id = profiles.id
  );

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to get user's active channels
CREATE OR REPLACE FUNCTION get_user_channels(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  channel_name TEXT,
  telegram_channel_id TEXT,
  is_default BOOLEAN,
  total_quizzes_sent INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.channel_name,
    tc.telegram_channel_id,
    tc.is_default,
    tc.total_quizzes_sent
  FROM public.telegram_channels tc
  WHERE tc.user_id = p_user_id AND tc.is_active = true
  ORDER BY tc.is_default DESC, tc.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get default channel for user
CREATE OR REPLACE FUNCTION get_default_channel(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  channel_name TEXT,
  telegram_bot_token TEXT,
  telegram_channel_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.channel_name,
    tc.telegram_bot_token,
    tc.telegram_channel_id
  FROM public.telegram_channels tc
  WHERE tc.user_id = p_user_id
    AND tc.is_active = true
    AND tc.is_default = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment quiz sent counter
CREATE OR REPLACE FUNCTION increment_channel_quiz_count(p_channel_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.telegram_channels
  SET
    total_quizzes_sent = total_quizzes_sent + 1,
    last_quiz_sent_at = now()
  WHERE id = p_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMPLETED SUCCESSFULLY
-- ============================================
