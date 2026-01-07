-- Fix RLS policy for question_banks to allow viewing public questions
-- This migration updates the SELECT policy to allow users to see:
-- 1. Their own questions (user_id = auth.uid())
-- 2. Public questions (is_public = true)

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own questions" ON public.question_banks;

-- Create a new policy that allows viewing own questions AND public questions
CREATE POLICY "Users can view own or public questions" ON public.question_banks
  FOR SELECT USING (
    auth.uid() = user_id  -- User can see their own questions
    OR is_public = true   -- Anyone can see public questions
  );

-- Add an index on is_public for better query performance
CREATE INDEX IF NOT EXISTS idx_question_banks_is_public ON public.question_banks(is_public);

-- Comment explaining the policy
COMMENT ON POLICY "Users can view own or public questions" ON public.question_banks IS 
  'Allows users to view their own questions and any question marked as public';
