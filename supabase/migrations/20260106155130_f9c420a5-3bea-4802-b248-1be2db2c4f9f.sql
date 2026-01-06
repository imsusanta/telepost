-- Allow users to INSERT subjects/topics with their own user_id

DROP POLICY IF EXISTS "Users can create own subjects" ON public.classification_subjects;
DROP POLICY IF EXISTS "Users can create own topics" ON public.classification_topics;

CREATE POLICY "Users can create own subjects" 
ON public.classification_subjects FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can create own topics" 
ON public.classification_topics FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());