-- Fix: Remove global visibility - users should ONLY see their own subjects/topics

DROP POLICY IF EXISTS "Users can read own or global subjects" ON public.classification_subjects;
DROP POLICY IF EXISTS "Users can read own or global topics" ON public.classification_topics;

CREATE POLICY "Users can only read own subjects" 
ON public.classification_subjects FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Users can only read own topics" 
ON public.classification_topics FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());