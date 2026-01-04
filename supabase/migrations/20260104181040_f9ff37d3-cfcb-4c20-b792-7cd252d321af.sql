-- Add missing columns to question_banks table for AI classification
ALTER TABLE public.question_banks ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.question_banks ADD COLUMN IF NOT EXISTS classification_confidence INTEGER;
ALTER TABLE public.question_banks ADD COLUMN IF NOT EXISTS classification_source TEXT DEFAULT 'manual';

-- Create optimization index for faster filtering
CREATE INDEX IF NOT EXISTS idx_question_banks_subject_topic ON public.question_banks(subject, topic);