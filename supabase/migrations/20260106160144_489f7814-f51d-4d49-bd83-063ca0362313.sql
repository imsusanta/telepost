-- Allow reading global subjects (user_id IS NULL) in addition to own subjects

DROP POLICY IF EXISTS "Users can only read own subjects" ON public.classification_subjects;
DROP POLICY IF EXISTS "Users can only read own topics" ON public.classification_topics;

CREATE POLICY "Users can read own or global subjects" 
ON public.classification_subjects FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can read own or global topics" 
ON public.classification_topics FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR user_id IS NULL);