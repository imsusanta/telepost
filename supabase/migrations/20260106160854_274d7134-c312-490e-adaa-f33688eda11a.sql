-- Complete isolation: Each user ONLY sees their own subjects/topics
-- NO global visibility at all

-- Drop all existing policies for subjects
DROP POLICY IF EXISTS "Users can read own or global subjects" ON public.classification_subjects;
DROP POLICY IF EXISTS "Users can only read own subjects" ON public.classification_subjects;
DROP POLICY IF EXISTS "Users can create own subjects" ON public.classification_subjects;
DROP POLICY IF EXISTS "Users can update own subjects" ON public.classification_subjects;
DROP POLICY IF EXISTS "Users can delete own subjects" ON public.classification_subjects;

-- Drop all existing policies for topics
DROP POLICY IF EXISTS "Users can read own or global topics" ON public.classification_topics;
DROP POLICY IF EXISTS "Users can only read own topics" ON public.classification_topics;
DROP POLICY IF EXISTS "Users can create own topics" ON public.classification_topics;
DROP POLICY IF EXISTS "Users can update own topics" ON public.classification_topics;
DROP POLICY IF EXISTS "Users can delete own topics" ON public.classification_topics;

-- Create strict isolation policies for SUBJECTS
CREATE POLICY "Strict user isolation - read subjects" 
ON public.classification_subjects FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Strict user isolation - insert subjects" 
ON public.classification_subjects FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Strict user isolation - update subjects" 
ON public.classification_subjects FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Strict user isolation - delete subjects" 
ON public.classification_subjects FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());

-- Create strict isolation policies for TOPICS
CREATE POLICY "Strict user isolation - read topics" 
ON public.classification_topics FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Strict user isolation - insert topics" 
ON public.classification_topics FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Strict user isolation - update topics" 
ON public.classification_topics FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Strict user isolation - delete topics" 
ON public.classification_topics FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());