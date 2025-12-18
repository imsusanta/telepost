-- =====================================================
-- CREATE ALL TABLES
-- =====================================================

-- COURSES TABLE
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    thumbnail_url TEXT,
    category TEXT DEFAULT 'general',
    difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    duration_hours INTEGER DEFAULT 0,
    price NUMERIC(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    enrollment_limit INTEGER,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- BATCHES TABLE
CREATE TABLE public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    timing TEXT,
    capacity INTEGER DEFAULT 30,
    current_strength INTEGER DEFAULT 0,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CHAPTERS TABLE
CREATE TABLE public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_free BOOLEAN DEFAULT false,
    duration_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- LESSONS TABLE
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT DEFAULT 'video' CHECK (content_type IN ('video', 'document', 'quiz', 'assignment', 'live_class')),
    video_url TEXT,
    video_duration_seconds INTEGER,
    content_html TEXT,
    order_index INTEGER DEFAULT 0,
    is_free BOOLEAN DEFAULT false,
    is_downloadable BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ENROLLMENTS TABLE
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    enrolled_by UUID,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'suspended', 'cancelled')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
    amount_paid NUMERIC(10,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    coupon_code TEXT,
    progress_percentage INTEGER DEFAULT 0,
    completed_lessons UUID[] DEFAULT '{}',
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,
    certificate_issued BOOLEAN DEFAULT false,
    certificate_url TEXT,
    roll_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, course_id)
);

-- COURSE CONTENT/NOTES TABLE
CREATE TABLE public.course_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_type TEXT CHECK (file_type IN ('pdf', 'doc', 'image', 'video', 'link')),
    file_url TEXT,
    file_size_bytes BIGINT,
    is_downloadable BOOLEAN DEFAULT true,
    visibility TEXT DEFAULT 'enrolled' CHECK (visibility IN ('public', 'enrolled', 'batch_specific')),
    batch_ids UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    version INTEGER DEFAULT 1,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- LESSON PROGRESS TABLE
CREATE TABLE public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress_percentage INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    last_position_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, lesson_id)
);

-- LIVE CLASSES TABLE
CREATE TABLE public.live_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    platform TEXT DEFAULT 'youtube' CHECK (platform IN ('youtube', 'zoom', 'meet', 'custom')),
    meeting_url TEXT,
    meeting_id TEXT,
    meeting_password TEXT,
    recording_url TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
    attendee_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- NOTICES TABLE
CREATE TABLE public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT,
    attachment_url TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'teachers', 'batch', 'course')),
    target_batch_ids UUID[] DEFAULT '{}',
    target_course_ids UUID[] DEFAULT '{}',
    target_user_ids UUID[] DEFAULT '{}',
    is_published BOOLEAN DEFAULT true,
    publish_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    read_by UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE HELPER FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_teacher(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(p_user_id, 'teacher'::app_role) OR public.has_role(p_user_id, 'admin'::app_role) OR public.has_role(p_user_id, 'super_admin'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_student(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(p_user_id, 'student'::app_role)
$$;

-- =====================================================
-- CREATE RLS POLICIES
-- =====================================================

-- COURSES POLICIES
CREATE POLICY "Anyone can view published courses" ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "Teachers can view own courses" ON public.courses FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Teachers can create courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Teachers can update own courses" ON public.courses FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Teachers can delete own courses" ON public.courses FOR DELETE USING (auth.uid() = created_by);
CREATE POLICY "Admins can manage all courses" ON public.courses FOR ALL USING (is_admin(auth.uid()));

-- BATCHES POLICIES
CREATE POLICY "Teachers can manage own batches" ON public.batches FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Admins can manage all batches" ON public.batches FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Students can view enrolled batches" ON public.batches FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.enrollments e WHERE e.batch_id = batches.id AND e.student_id = auth.uid())
);

-- CHAPTERS POLICIES
CREATE POLICY "Anyone can view chapters of published courses" ON public.chapters FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = chapters.course_id AND c.is_published = true)
);
CREATE POLICY "Teachers can manage own course chapters" ON public.chapters FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = chapters.course_id AND c.created_by = auth.uid())
);
CREATE POLICY "Admins can manage all chapters" ON public.chapters FOR ALL USING (is_admin(auth.uid()));

-- LESSONS POLICIES
CREATE POLICY "Anyone can view free lessons" ON public.lessons FOR SELECT USING (is_free = true);
CREATE POLICY "Enrolled students can view lessons" ON public.lessons FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.chapters ch ON ch.course_id = e.course_id
        WHERE ch.id = lessons.chapter_id AND e.student_id = auth.uid() AND e.status = 'active'
    )
);
CREATE POLICY "Teachers can manage own lessons" ON public.lessons FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.chapters ch
        JOIN public.courses c ON c.id = ch.course_id
        WHERE ch.id = lessons.chapter_id AND c.created_by = auth.uid()
    )
);
CREATE POLICY "Admins can manage all lessons" ON public.lessons FOR ALL USING (is_admin(auth.uid()));

-- ENROLLMENTS POLICIES
CREATE POLICY "Students can view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers can view course enrollments" ON public.enrollments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = enrollments.course_id AND c.created_by = auth.uid())
);
CREATE POLICY "Teachers can manage course enrollments" ON public.enrollments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = enrollments.course_id AND c.created_by = auth.uid())
);
CREATE POLICY "Admins can manage all enrollments" ON public.enrollments FOR ALL USING (is_admin(auth.uid()));

-- COURSE CONTENT POLICIES
CREATE POLICY "Teachers can manage own content" ON public.course_content FOR ALL USING (auth.uid() = uploaded_by);
CREATE POLICY "Enrolled students can view content" ON public.course_content FOR SELECT USING (
    visibility = 'public' OR
    (visibility = 'enrolled' AND EXISTS (
        SELECT 1 FROM public.enrollments e WHERE e.course_id = course_content.course_id AND e.student_id = auth.uid()
    ))
);
CREATE POLICY "Admins can manage all content" ON public.course_content FOR ALL USING (is_admin(auth.uid()));

-- LESSON PROGRESS POLICIES
CREATE POLICY "Students can manage own progress" ON public.lesson_progress FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Teachers can view student progress" ON public.lesson_progress FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.chapters ch ON ch.id = l.chapter_id
        JOIN public.courses c ON c.id = ch.course_id
        WHERE l.id = lesson_progress.lesson_id AND c.created_by = auth.uid()
    )
);
CREATE POLICY "Admins can view all progress" ON public.lesson_progress FOR SELECT USING (is_admin(auth.uid()));

-- LIVE CLASSES POLICIES
CREATE POLICY "Teachers can manage own live classes" ON public.live_classes FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Enrolled students can view live classes" ON public.live_classes FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = live_classes.course_id AND e.student_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.enrollments e WHERE e.batch_id = live_classes.batch_id AND e.student_id = auth.uid())
);
CREATE POLICY "Admins can manage all live classes" ON public.live_classes FOR ALL USING (is_admin(auth.uid()));

-- NOTICES POLICIES
CREATE POLICY "Anyone can view published notices" ON public.notices FOR SELECT USING (
    is_published = true AND (expires_at IS NULL OR expires_at > now())
);
CREATE POLICY "Teachers can manage own notices" ON public.notices FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Admins can manage all notices" ON public.notices FOR ALL USING (is_admin(auth.uid()));

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_course_content_updated_at BEFORE UPDATE ON public.course_content FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_live_classes_updated_at BEFORE UPDATE ON public.live_classes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_notices_updated_at BEFORE UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- CREATE INDEXES
-- =====================================================
CREATE INDEX idx_courses_created_by ON public.courses(created_by);
CREATE INDEX idx_courses_is_published ON public.courses(is_published);
CREATE INDEX idx_courses_category ON public.courses(category);
CREATE INDEX idx_batches_course_id ON public.batches(course_id);
CREATE INDEX idx_batches_status ON public.batches(status);
CREATE INDEX idx_chapters_course_id ON public.chapters(course_id);
CREATE INDEX idx_chapters_order ON public.chapters(course_id, order_index);
CREATE INDEX idx_lessons_chapter_id ON public.lessons(chapter_id);
CREATE INDEX idx_lessons_order ON public.lessons(chapter_id, order_index);
CREATE INDEX idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX idx_enrollments_batch ON public.enrollments(batch_id);
CREATE INDEX idx_lesson_progress_student ON public.lesson_progress(student_id);
CREATE INDEX idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);
CREATE INDEX idx_live_classes_scheduled ON public.live_classes(scheduled_at);
CREATE INDEX idx_notices_publish_at ON public.notices(publish_at);