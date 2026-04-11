-- Add features JSONB column to subscription_plans
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}';

-- Migrate existing boolean columns into features JSONB
UPDATE public.subscription_plans
SET features = jsonb_build_object(
  'create_quiz', jsonb_build_object(
    'enabled', true,
    'ai_generated', COALESCE(has_ai_quiz, false),
    'manual_input', COALESCE(has_manual_input, true),
    'question_bank', true,
    'documents', COALESCE(has_pdf_quiz, false)
  ),
  'create_post', jsonb_build_object(
    'enabled', true,
    'write_with_ai', COALESCE(has_write_with_ai, false)
  ),
  'channels', true,
  'stories', COALESCE(has_story, true),
  'question_bank', jsonb_build_object(
    'enabled', true,
    'my_questions', true,
    'ai_generate', COALESCE(has_advanced_ai, false),
    'pdf_generate', COALESCE(has_documents_access, false)
  ),
  'knowledge_base', COALESCE(has_kb_access, false),
  'scheduler', COALESCE(has_auto_scheduling, false)
);
