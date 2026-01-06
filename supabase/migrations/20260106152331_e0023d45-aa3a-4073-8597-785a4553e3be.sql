-- Add user_id columns
ALTER TABLE public.classification_subjects 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.classification_topics 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old policies for subjects
DROP POLICY IF EXISTS "Allow public read for classification_subjects" ON public.classification_subjects;
DROP POLICY IF EXISTS "Allow super_admin only to manage classification_subjects" ON public.classification_subjects;
DROP POLICY IF EXISTS "Anyone can view subjects" ON public.classification_subjects;
DROP POLICY IF EXISTS "Authenticated users can manage subjects" ON public.classification_subjects;

-- Create new RLS policies for subjects
CREATE POLICY "Users can read own or global subjects" 
ON public.classification_subjects FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create own subjects" 
ON public.classification_subjects FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subjects" 
ON public.classification_subjects FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own subjects" 
ON public.classification_subjects FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());

-- Drop old policies for topics
DROP POLICY IF EXISTS "Allow public read for classification_topics" ON public.classification_topics;
DROP POLICY IF EXISTS "Allow super_admin only to manage classification_topics" ON public.classification_topics;
DROP POLICY IF EXISTS "Anyone can view topics" ON public.classification_topics;
DROP POLICY IF EXISTS "Authenticated users can manage topics" ON public.classification_topics;

-- Create new RLS policies for topics
CREATE POLICY "Users can read own or global topics" 
ON public.classification_topics FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create own topics" 
ON public.classification_topics FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own topics" 
ON public.classification_topics FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own topics" 
ON public.classification_topics FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_classification_subjects_user_id ON public.classification_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_classification_topics_user_id ON public.classification_topics(user_id);