-- Tests/Exams table
CREATE TABLE public.tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  test_type TEXT DEFAULT 'mcq' CHECK (test_type IN ('mcq', 'mixed', 'subjective')),
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  duration_minutes INTEGER DEFAULT 60,
  total_marks INTEGER DEFAULT 100,
  passing_marks INTEGER DEFAULT 40,
  negative_marking BOOLEAN DEFAULT false,
  negative_marks_per_question NUMERIC DEFAULT 0,
  shuffle_questions BOOLEAN DEFAULT true,
  shuffle_options BOOLEAN DEFAULT true,
  show_result_immediately BOOLEAN DEFAULT true,
  show_correct_answers BOOLEAN DEFAULT true,
  max_attempts INTEGER DEFAULT 1,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT false,
  is_telegram_enabled BOOLEAN DEFAULT false,
  telegram_channel_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'archived')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Test Questions table (links tests to question bank or custom questions)
CREATE TABLE public.test_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_bank_id UUID REFERENCES public.question_banks(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  marks INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT true,
  -- If not using question bank, store custom question
  custom_question TEXT,
  custom_options JSONB,
  custom_correct_index INTEGER,
  custom_explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Test Attempts table
CREATE TABLE public.test_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_taken_seconds INTEGER,
  total_questions INTEGER DEFAULT 0,
  attempted_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  skipped_questions INTEGER DEFAULT 0,
  score NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  passed BOOLEAN,
  rank INTEGER,
  answers JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'evaluated', 'expired')),
  ip_address TEXT,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Test Analytics table
CREATE TABLE public.test_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.test_questions(id) ON DELETE SET NULL,
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  wrong_attempts INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  avg_time_seconds INTEGER DEFAULT 0,
  difficulty_rating NUMERIC,
  topic_wise_stats JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_analytics ENABLE ROW LEVEL SECURITY;

-- Tests policies
CREATE POLICY "Teachers can manage own tests" ON public.tests
  FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all tests" ON public.tests
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Students can view published tests" ON public.tests
  FOR SELECT USING (
    is_published = true AND
    (start_time IS NULL OR start_time <= now()) AND
    (end_time IS NULL OR end_time >= now())
  );

-- Test Questions policies
CREATE POLICY "Teachers can manage test questions" ON public.test_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.created_by = auth.uid())
  );

CREATE POLICY "Students can view questions of accessible tests" ON public.test_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tests t 
      WHERE t.id = test_id AND t.is_published = true
    )
  );

-- Test Attempts policies
CREATE POLICY "Students can manage own attempts" ON public.test_attempts
  FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view attempts on their tests" ON public.test_attempts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.created_by = auth.uid())
  );

CREATE POLICY "Admins can view all attempts" ON public.test_attempts
  FOR SELECT USING (is_admin(auth.uid()));

-- Test Analytics policies
CREATE POLICY "Teachers can view analytics for own tests" ON public.test_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.created_by = auth.uid())
  );

CREATE POLICY "Admins can view all analytics" ON public.test_analytics
  FOR SELECT USING (is_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_tests_created_by ON public.tests(created_by);
CREATE INDEX idx_tests_course_id ON public.tests(course_id);
CREATE INDEX idx_tests_status ON public.tests(status);
CREATE INDEX idx_test_questions_test_id ON public.test_questions(test_id);
CREATE INDEX idx_test_attempts_test_id ON public.test_attempts(test_id);
CREATE INDEX idx_test_attempts_student_id ON public.test_attempts(student_id);
CREATE INDEX idx_test_analytics_test_id ON public.test_analytics(test_id);

-- Triggers for updated_at
CREATE TRIGGER update_tests_updated_at
  BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_test_analytics_updated_at
  BEFORE UPDATE ON public.test_analytics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();