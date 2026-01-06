-- Create classification_subjects table
CREATE TABLE IF NOT EXISTS public.classification_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create classification_topics table
CREATE TABLE IF NOT EXISTS public.classification_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.classification_subjects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(subject_id, name)
);

-- Enable RLS
ALTER TABLE public.classification_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classification_subjects
CREATE POLICY "Allow public read for classification_subjects" 
ON public.classification_subjects FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow super_admin only to manage classification_subjects" 
ON public.classification_subjects FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (
            profiles.status = 'super_admin' OR 
            EXISTS (
                SELECT 1 FROM auth.users 
                WHERE auth.users.id = auth.uid() 
                AND auth.users.raw_app_meta_data->>'role' = 'super_admin'
            )
        )
    )
);

-- RLS Policies for classification_topics
CREATE POLICY "Allow public read for classification_topics" 
ON public.classification_topics FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow super_admin only to manage classification_topics" 
ON public.classification_topics FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (
            profiles.status = 'super_admin' OR 
            EXISTS (
                SELECT 1 FROM auth.users 
                WHERE auth.users.id = auth.uid() 
                AND auth.users.raw_app_meta_data->>'role' = 'super_admin'
            )
        )
    )
);

-- Seed initial subjects from PREDEFINED_SUBJECTS
INSERT INTO public.classification_subjects (name, color, icon)
VALUES 
    ('History', '#9333ea', '📜'),
    ('Geography', '#16a34a', '🌍'),
    ('Science', '#2563eb', '🔬'),
    ('Mathematics', '#ea580c', '🔢'),
    ('English', '#0d9488', '📚'),
    ('Bengali', '#db2777', '📖'),
    ('General Knowledge', '#4f46e5', '💡'),
    ('Current Affairs', '#dc2626', '📰'),
    ('Economics', '#d97706', '💰'),
    ('Political Science', '#0891b2', '⚖️'),
    ('Computer Science', '#7c3aed', '💻'),
    ('Reasoning', '#475569', '🧠')
ON CONFLICT (name) DO NOTHING;
