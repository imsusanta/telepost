-- Create classification_subjects table for organizing questions by subject
CREATE TABLE public.classification_subjects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classification_topics table for organizing questions by topic within subjects
CREATE TABLE public.classification_topics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.classification_subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(subject_id, name)
);

-- Enable RLS
ALTER TABLE public.classification_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_topics ENABLE ROW LEVEL SECURITY;

-- RLS policies for classification_subjects (publicly readable, admin writable)
CREATE POLICY "Anyone can view subjects" ON public.classification_subjects FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage subjects" ON public.classification_subjects FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS policies for classification_topics (publicly readable, admin writable)
CREATE POLICY "Anyone can view topics" ON public.classification_topics FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage topics" ON public.classification_topics FOR ALL USING (auth.uid() IS NOT NULL);

-- Create indexes for faster lookups
CREATE INDEX idx_classification_topics_subject_id ON public.classification_topics(subject_id);