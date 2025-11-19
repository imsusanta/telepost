-- Add missing columns to question_banks table
ALTER TABLE public.question_banks 
ADD COLUMN IF NOT EXISTS language text DEFAULT 'bn',
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS times_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS times_correct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS times_incorrect integer DEFAULT 0;

-- Add check constraint for processing_status if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'documents_processing_status_check'
  ) THEN
    ALTER TABLE public.documents 
    ADD CONSTRAINT documents_processing_status_check 
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;
END $$;