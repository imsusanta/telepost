-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own questions" ON public.question_banks;

-- Create new policy allowing own + public questions
CREATE POLICY "Users can view own or public questions" ON public.question_banks
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_public = true
  );

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_question_banks_is_public ON public.question_banks(is_public);