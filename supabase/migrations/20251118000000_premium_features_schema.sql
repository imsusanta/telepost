-- =============================================
-- PREMIUM FEATURES DATABASE SCHEMA
-- =============================================
-- This migration adds all tables needed for premium features:
-- 1. Subscriptions & Plan Management
-- 2. Document Storage (PDF uploads)
-- 3. Question Bank (50K+ questions)
-- 4. Analytics & Engagement Tracking
-- 5. Leaderboards & Gamification
-- 6. Priority Support
-- 7. Usage Tracking & Quotas
-- =============================================

-- ============================================
-- 1. SUBSCRIPTIONS & PLAN MANAGEMENT
-- ============================================

-- Subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'starter', 'pro', 'agency', 'enterprise'
  display_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'

  -- Feature limits
  max_telegram_channels INTEGER NOT NULL DEFAULT 1,
  max_pdf_storage_gb INTEGER NOT NULL DEFAULT 10,
  max_quizzes_per_month INTEGER, -- NULL = unlimited
  max_batch_quiz_generation INTEGER NOT NULL DEFAULT 1,
  max_question_bank_size INTEGER NOT NULL DEFAULT 10000,

  -- Feature flags
  has_advanced_ai BOOLEAN NOT NULL DEFAULT false,
  has_auto_scheduling BOOLEAN NOT NULL DEFAULT false,
  has_auto_pdf_explanations BOOLEAN NOT NULL DEFAULT false,
  has_analytics_dashboard BOOLEAN NOT NULL DEFAULT false,
  has_leaderboards BOOLEAN NOT NULL DEFAULT false,
  has_custom_branding BOOLEAN NOT NULL DEFAULT false,
  has_multi_language BOOLEAN NOT NULL DEFAULT false,
  has_priority_support BOOLEAN NOT NULL DEFAULT false,
  has_api_access BOOLEAN NOT NULL DEFAULT false,
  has_white_label BOOLEAN NOT NULL DEFAULT false,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),

  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'expired', 'past_due'
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,

  -- Payment info (for future Stripe/Razorpay integration)
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(user_id) -- One active subscription per user
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Monthly counters (reset at billing period)
  quizzes_generated_this_month INTEGER NOT NULL DEFAULT 0,
  pdfs_uploaded_this_month INTEGER NOT NULL DEFAULT 0,

  -- Total usage
  total_quizzes_generated INTEGER NOT NULL DEFAULT 0,
  total_pdfs_uploaded INTEGER NOT NULL DEFAULT 0,
  total_storage_used_bytes BIGINT NOT NULL DEFAULT 0,

  -- Tracking
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(user_id)
);

-- ============================================
-- 2. DOCUMENT STORAGE (PDF UPLOADS)
-- ============================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File metadata
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'application/pdf',
  storage_path TEXT NOT NULL, -- Path in Supabase Storage

  -- Document info
  title TEXT,
  description TEXT,
  language TEXT DEFAULT 'bn', -- 'en', 'bn', 'hi', etc.

  -- Extracted content
  extracted_text TEXT, -- Full text extracted from PDF
  page_count INTEGER,

  -- Processing status
  processing_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processing_error TEXT,

  -- AI analysis
  ai_summary TEXT,
  topics JSONB, -- Array of identified topics

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_status ON public.documents(processing_status);

-- ============================================
-- 3. QUESTION BANK (50K+ QUESTIONS)
-- ============================================

CREATE TABLE IF NOT EXISTS public.question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system questions

  -- Question content
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of option strings
  correct_option_index INTEGER NOT NULL,
  explanation TEXT,

  -- Categorization
  topic TEXT NOT NULL,
  subject TEXT, -- e.g., 'Mathematics', 'Science', 'History'
  difficulty TEXT NOT NULL DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  language TEXT NOT NULL DEFAULT 'bn', -- 'en', 'bn', 'hi', etc.

  -- Metadata
  tags JSONB, -- Array of tags for filtering
  source TEXT, -- 'ai_generated', 'imported', 'manual', 'document'
  source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,

  -- Usage stats
  times_used INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  times_incorrect INTEGER NOT NULL DEFAULT 0,

  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT false, -- Public questions available to all users

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_banks_user_id ON public.question_banks(user_id);
CREATE INDEX idx_question_banks_topic ON public.question_banks(topic);
CREATE INDEX idx_question_banks_subject ON public.question_banks(subject);
CREATE INDEX idx_question_banks_difficulty ON public.question_banks(difficulty);
CREATE INDEX idx_question_banks_language ON public.question_banks(language);
CREATE INDEX idx_question_banks_public ON public.question_banks(is_public) WHERE is_public = true;

-- ============================================
-- 4. ANALYTICS & ENGAGEMENT TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS public.quiz_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Quiz metadata
  topic TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'bn',

  -- Source
  source_type TEXT NOT NULL DEFAULT 'ai', -- 'ai', 'manual', 'document', 'question_bank'
  source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,

  -- Quiz data
  quiz_data JSONB NOT NULL,

  -- Delivery
  delivery_method TEXT, -- 'telegram', 'scheduled', 'export'
  telegram_chat_id TEXT,
  scheduled_post_id UUID,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_generations_user_id ON public.quiz_generations(user_id);
CREATE INDEX idx_quiz_generations_created_at ON public.quiz_generations(created_at DESC);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL, -- 'quiz_generated', 'quiz_sent', 'pdf_uploaded', 'question_answered', etc.
  event_data JSONB,

  -- Context
  quiz_generation_id UUID REFERENCES public.quiz_generations(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- ============================================
-- 5. LEADERBOARDS & GAMIFICATION
-- ============================================

CREATE TABLE IF NOT EXISTS public.quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_generation_id UUID REFERENCES public.quiz_generations(id) ON DELETE CASCADE,

  -- Student info (if anonymous, user_id can be NULL)
  student_name TEXT,
  student_telegram_id TEXT,
  student_email TEXT,

  -- Response data
  responses JSONB NOT NULL, -- Array of {question_id, selected_option_index, is_correct}
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL,

  -- Time tracking
  time_taken_seconds INTEGER,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_responses_user_id ON public.quiz_responses(user_id);
CREATE INDEX idx_quiz_responses_quiz_id ON public.quiz_responses(quiz_generation_id);
CREATE INDEX idx_quiz_responses_score ON public.quiz_responses(score DESC);

CREATE TABLE IF NOT EXISTS public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- User identifier (for students)
  student_name TEXT,
  student_telegram_id TEXT,

  -- Leaderboard type
  board_type TEXT NOT NULL, -- 'global', 'topic', 'batch', 'channel'
  board_key TEXT, -- e.g., topic name, batch id, channel id

  -- Stats
  total_quizzes_taken INTEGER NOT NULL DEFAULT 0,
  total_questions_answered INTEGER NOT NULL DEFAULT 0,
  total_correct_answers INTEGER NOT NULL DEFAULT 0,
  average_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,

  -- Rankings
  rank INTEGER,

  -- Gamification
  level INTEGER NOT NULL DEFAULT 1,
  experience_points INTEGER NOT NULL DEFAULT 0,
  badges JSONB, -- Array of earned badges

  last_quiz_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(user_id, board_type, board_key)
);

CREATE INDEX idx_leaderboards_board ON public.leaderboards(board_type, board_key);
CREATE INDEX idx_leaderboards_rank ON public.leaderboards(rank);
CREATE INDEX idx_leaderboards_points ON public.leaderboards(total_points DESC);

-- ============================================
-- 6. PRIORITY SUPPORT
-- ============================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Ticket info
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  category TEXT, -- 'technical', 'billing', 'feature_request', 'bug'

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Resolution
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  message TEXT NOT NULL,
  is_staff_reply BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);

-- ============================================
-- 7. CUSTOM BRANDING
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Logo
  logo_url TEXT,
  logo_storage_path TEXT,

  -- Colors
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#8b5cf6',

  -- PDF customization
  pdf_header TEXT,
  pdf_footer TEXT,
  institute_name TEXT,
  institute_website TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(user_id)
);

-- ============================================
-- 8. FIX SCHEDULED POSTS (ADD USER_ID)
-- ============================================

-- Add user_id to scheduled_telegram_posts
ALTER TABLE public.scheduled_telegram_posts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON public.scheduled_telegram_posts(user_id);

-- Update RLS policies to use user_id
DROP POLICY IF EXISTS "Anyone can schedule posts" ON public.scheduled_telegram_posts;
DROP POLICY IF EXISTS "Anyone can view scheduled posts" ON public.scheduled_telegram_posts;

CREATE POLICY "Users can insert their own scheduled posts"
ON public.scheduled_telegram_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own scheduled posts"
ON public.scheduled_telegram_posts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled posts"
ON public.scheduled_telegram_posts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled posts"
ON public.scheduled_telegram_posts
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branding ENABLE ROW LEVEL SECURITY;

-- Subscription Plans (public read)
CREATE POLICY "Anyone can view subscription plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- Subscriptions (user can view/update their own)
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- Usage Tracking
CREATE POLICY "Users can view their own usage"
ON public.usage_tracking FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
ON public.usage_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
ON public.usage_tracking FOR UPDATE
USING (auth.uid() = user_id);

-- Documents
CREATE POLICY "Users can view their own documents"
ON public.documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
ON public.documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON public.documents FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.documents FOR DELETE
USING (auth.uid() = user_id);

-- Question Banks
CREATE POLICY "Users can view their own and public questions"
ON public.question_banks FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own questions"
ON public.question_banks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questions"
ON public.question_banks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questions"
ON public.question_banks FOR DELETE
USING (auth.uid() = user_id);

-- Quiz Generations
CREATE POLICY "Users can view their own quiz generations"
ON public.quiz_generations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz generations"
ON public.quiz_generations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Analytics Events
CREATE POLICY "Users can view their own analytics"
ON public.analytics_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
ON public.analytics_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Quiz Responses
CREATE POLICY "Users can view responses for their quizzes"
ON public.quiz_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_generations
    WHERE quiz_generations.id = quiz_responses.quiz_generation_id
    AND quiz_generations.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can submit quiz responses"
ON public.quiz_responses FOR INSERT
WITH CHECK (true); -- Students can be anonymous

-- Leaderboards
CREATE POLICY "Users can view leaderboards"
ON public.leaderboards FOR SELECT
USING (true); -- Public leaderboards

CREATE POLICY "Users can insert their own leaderboard entries"
ON public.leaderboards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leaderboard entries"
ON public.leaderboards FOR UPDATE
USING (auth.uid() = user_id);

-- Support Tickets
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
ON public.support_tickets FOR UPDATE
USING (auth.uid() = user_id);

-- Support Ticket Messages
CREATE POLICY "Users can view messages for their tickets"
ON public.support_ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_ticket_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages for their tickets"
ON public.support_ticket_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- User Branding
CREATE POLICY "Users can view their own branding"
ON public.user_branding FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own branding"
ON public.user_branding FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own branding"
ON public.user_branding FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- 10. SEED DEFAULT SUBSCRIPTION PLANS
-- ============================================

INSERT INTO public.subscription_plans (name, display_name, price, max_telegram_channels, max_pdf_storage_gb, max_quizzes_per_month, max_batch_quiz_generation, max_question_bank_size, has_advanced_ai, has_auto_scheduling, has_auto_pdf_explanations, has_analytics_dashboard, has_leaderboards, has_custom_branding, has_multi_language, has_priority_support, has_api_access, has_white_label)
VALUES
  ('starter', 'Starter', 29.00, 1, 10, 50, 1, 10000, false, false, false, false, false, false, false, false, false, false),
  ('pro', 'Pro', 99.00, 3, 50, NULL, 30, 50000, true, true, true, true, true, true, true, true, false, false),
  ('agency', 'Agency', 249.00, 10, 200, NULL, 100, 200000, true, true, true, true, true, true, true, true, true, true),
  ('enterprise', 'Enterprise', 999.00, 999, 1000, NULL, 1000, 1000000, true, true, true, true, true, true, true, true, true, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 11. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_banks_updated_at BEFORE UPDATE ON public.question_banks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboards_updated_at BEFORE UPDATE ON public.leaderboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_branding_updated_at BEFORE UPDATE ON public.user_branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get user's subscription plan
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TABLE (
  plan_name TEXT,
  plan_features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.name,
    jsonb_build_object(
      'max_telegram_channels', sp.max_telegram_channels,
      'max_pdf_storage_gb', sp.max_pdf_storage_gb,
      'max_quizzes_per_month', sp.max_quizzes_per_month,
      'max_batch_quiz_generation', sp.max_batch_quiz_generation,
      'max_question_bank_size', sp.max_question_bank_size,
      'has_advanced_ai', sp.has_advanced_ai,
      'has_auto_scheduling', sp.has_auto_scheduling,
      'has_auto_pdf_explanations', sp.has_auto_pdf_explanations,
      'has_analytics_dashboard', sp.has_analytics_dashboard,
      'has_leaderboards', sp.has_leaderboards,
      'has_custom_branding', sp.has_custom_branding,
      'has_multi_language', sp.has_multi_language,
      'has_priority_support', sp.has_priority_support,
      'has_api_access', sp.has_api_access,
      'has_white_label', sp.has_white_label
    )
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = p_user_id AND s.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMPLETED SUCCESSFULLY
-- ============================================
