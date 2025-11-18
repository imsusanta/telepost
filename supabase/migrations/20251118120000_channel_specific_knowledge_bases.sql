-- Migration: Channel-Specific Knowledge Bases
-- Description: Adds support for multiple channels per user with isolated knowledge bases

-- Create channels table
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    telegram_channel_id TEXT,
    telegram_bot_token TEXT,
    description TEXT,

    -- Channel-specific settings for auto quiz generation
    settings JSONB DEFAULT '{
        "auto_generate_quizzes": false,
        "default_subject": "",
        "default_difficulty": "medium",
        "default_language": "en",
        "questions_per_quiz": 10,
        "generation_frequency": "daily",
        "system_prompt": ""
    }'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_channel_name UNIQUE(user_id, name)
);

-- Add indexes for channels
CREATE INDEX idx_channels_user_id ON public.channels(user_id);
CREATE INDEX idx_channels_telegram_channel_id ON public.channels(telegram_channel_id);

-- Enable RLS for channels
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channels
CREATE POLICY "Users can view their own channels"
    ON public.channels FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own channels"
    ON public.channels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channels"
    ON public.channels FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own channels"
    ON public.channels FOR DELETE
    USING (auth.uid() = user_id);

-- Add channel_id to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;

-- Add index for channel_id in documents
CREATE INDEX IF NOT EXISTS idx_documents_channel_id ON public.documents(channel_id);

-- Add channel_id to quiz_generations table
ALTER TABLE public.quiz_generations
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;

-- Add index for channel_id in quiz_generations
CREATE INDEX IF NOT EXISTS idx_quiz_generations_channel_id ON public.quiz_generations(channel_id);

-- Add channel_id to question_banks table
ALTER TABLE public.question_banks
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;

-- Add index for channel_id in question_banks
CREATE INDEX IF NOT EXISTS idx_question_banks_channel_id ON public.question_banks(channel_id);

-- Update trigger for channels
CREATE OR REPLACE FUNCTION public.handle_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channels_updated_at
    BEFORE UPDATE ON public.channels
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_channels_updated_at();

-- Migration data: Create default channel for existing users with telegram config
INSERT INTO public.channels (user_id, name, telegram_channel_id, telegram_bot_token, description, settings)
SELECT
    id as user_id,
    'Default Channel' as name,
    telegram_channel_id,
    telegram_bot_token,
    'Migrated from profile settings' as description,
    '{
        "auto_generate_quizzes": false,
        "default_subject": "",
        "default_difficulty": "medium",
        "default_language": "bn",
        "questions_per_quiz": 10,
        "generation_frequency": "daily",
        "system_prompt": ""
    }'::jsonb as settings
FROM public.profiles
WHERE telegram_channel_id IS NOT NULL OR telegram_bot_token IS NOT NULL
ON CONFLICT DO NOTHING;

-- Update existing documents to link to default channel
UPDATE public.documents d
SET channel_id = (
    SELECT c.id
    FROM public.channels c
    WHERE c.user_id = d.user_id
    AND c.name = 'Default Channel'
    LIMIT 1
)
WHERE channel_id IS NULL;

-- Update existing quiz_generations to link to default channel
UPDATE public.quiz_generations qg
SET channel_id = (
    SELECT c.id
    FROM public.channels c
    WHERE c.user_id = qg.user_id
    AND c.name = 'Default Channel'
    LIMIT 1
)
WHERE channel_id IS NULL;

-- Update existing question_banks to link to default channel
UPDATE public.question_banks qb
SET channel_id = (
    SELECT c.id
    FROM public.channels c
    WHERE c.user_id = qb.user_id
    AND c.name = 'Default Channel'
    LIMIT 1
)
WHERE channel_id IS NULL;

-- Add helpful comments
COMMENT ON TABLE public.channels IS 'Stores Telegram channels with isolated knowledge bases for each channel';
COMMENT ON COLUMN public.channels.settings IS 'JSON settings for auto quiz generation: auto_generate_quizzes, default_subject, default_difficulty, default_language, questions_per_quiz, generation_frequency, system_prompt';
COMMENT ON COLUMN public.documents.channel_id IS 'Links document to specific channel for isolated knowledge base';
COMMENT ON COLUMN public.quiz_generations.channel_id IS 'Links quiz to specific channel';
COMMENT ON COLUMN public.question_banks.channel_id IS 'Links question to specific channel knowledge base';
