-- Fix: Remove global visibility - users should ONLY see their own subjects/topics
-- Super admin's subjects/topics should NOT be visible to regular users

-- Drop the current policies that allow global visibility
DROP POLICY IF EXISTS "Users can read own or global subjects" ON public.classification_subjects;
DROP POLICY IF EXISTS "Users can read own or global topics" ON public.classification_topics;

-- Create new policies: users can ONLY see their own subjects
CREATE POLICY "Users can only read own subjects" 
ON public.classification_subjects FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Create new policies: users can ONLY see their own topics
CREATE POLICY "Users can only read own topics" 
ON public.classification_topics FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());
