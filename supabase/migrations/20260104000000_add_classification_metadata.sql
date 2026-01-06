-- Add classification metadata columns to question_banks table
-- Migration: Add classification support

-- Add classification_confidence column (0-10 score)
ALTER TABLE public.question_banks
ADD COLUMN IF NOT EXISTS classification_confidence INTEGER;

-- Add subject column
ALTER TABLE public.question_banks
ADD COLUMN IF NOT EXISTS subject TEXT;

-- Add classification_source column (auto or manual)
ALTER TABLE public.question_banks
ADD COLUMN IF NOT EXISTS classification_source TEXT DEFAULT 'manual';

-- Add constraint for classification_source
ALTER TABLE public.question_banks
DROP CONSTRAINT IF EXISTS question_banks_classification_source_check;

ALTER TABLE public.question_banks
ADD CONSTRAINT question_banks_classification_source_check 
CHECK (classification_source IN ('auto', 'manual'));

-- Add constraint for classification_confidence range
ALTER TABLE public.question_banks
DROP CONSTRAINT IF EXISTS question_banks_classification_confidence_check;

ALTER TABLE public.question_banks
ADD CONSTRAINT question_banks_classification_confidence_check 
CHECK (classification_confidence IS NULL OR (classification_confidence >= 0 AND classification_confidence <= 100));

-- Create composite index for subject and topic filtering
CREATE INDEX IF NOT EXISTS idx_question_banks_subject_topic 
ON public.question_banks(subject, topic);

-- Create index for classification source
CREATE INDEX IF NOT EXISTS idx_question_banks_classification_source 
ON public.question_banks(classification_source);

-- Add comment for documentation
COMMENT ON COLUMN public.question_banks.classification_confidence IS 'AI classification confidence score (0-100)';
COMMENT ON COLUMN public.question_banks.classification_source IS 'Source of classification: auto (AI) or manual (user)';
