-- Add user_id column to classification_subjects and classification_topics
-- This allows each user to have their own subjects and topics

-- Step 1: Add user_id column to classification_subjects
ALTER TABLE public.classification_subjects 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Add user_id column to classification_topics
ALTER TABLE public.classification_topics 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Remove the UNIQUE constraint on name for subjects (since each user can have same subject name)
ALTER TABLE public.classification_subjects DROP CONSTRAINT IF EXISTS classification_subjects_name_key;

-- Step 4: Add a new unique constraint (name, user_id) - so same user can't have duplicate names
-- Allow null user_id for global/default subjects
CREATE UNIQUE INDEX IF NOT EXISTS idx_classification_subjects_user_name 
ON public.classification_subjects (name, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_classification_subjects_user_id ON public.classification_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_classification_topics_user_id ON public.classification_topics(user_id);

-- Step 6: Drop old RLS policies
DROP POLICY IF EXISTS "Allow public read for classification_subjects" ON public.classification_subjects;
DROP POLICY IF EXISTS "Allow super_admin only to manage classification_subjects" ON public.classification_subjects;
DROP POLICY IF EXISTS "Allow public read for classification_topics" ON public.classification_topics;
DROP POLICY IF EXISTS "Allow super_admin only to manage classification_topics" ON public.classification_topics;

-- Step 7: Create new RLS policies for subjects
-- Users can read: their own subjects + global subjects (user_id IS NULL)
CREATE POLICY "Users can read own or global subjects" 
ON public.classification_subjects FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can create their own subjects
CREATE POLICY "Users can create own subjects" 
ON public.classification_subjects FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Users can update their own subjects
CREATE POLICY "Users can update own subjects" 
ON public.classification_subjects FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

-- Users can delete their own subjects
CREATE POLICY "Users can delete own subjects" 
ON public.classification_subjects FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());

-- Step 8: Create new RLS policies for topics
-- Users can read: their own topics + global topics (user_id IS NULL)
CREATE POLICY "Users can read own or global topics" 
ON public.classification_topics FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can create their own topics
CREATE POLICY "Users can create own topics" 
ON public.classification_topics FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Users can update their own topics
CREATE POLICY "Users can update own topics" 
ON public.classification_topics FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

-- Users can delete their own topics
CREATE POLICY "Users can delete own topics" 
ON public.classification_topics FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());

-- Note: Existing subjects (History, Geography, etc.) will have user_id = NULL, so they remain as global/default subjects visible to all users.
