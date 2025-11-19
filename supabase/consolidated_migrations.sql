--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- PostgreSQL database dump complete
--


-- Create table for scheduled Telegram quiz posts
CREATE TABLE public.scheduled_telegram_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL,
  quiz_data JSONB NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient querying of pending posts
CREATE INDEX idx_scheduled_posts_status_time ON public.scheduled_telegram_posts(status, scheduled_time) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.scheduled_telegram_posts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert scheduled posts (public quiz app)
CREATE POLICY "Anyone can schedule posts" 
ON public.scheduled_telegram_posts 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to view their scheduled posts
CREATE POLICY "Anyone can view scheduled posts" 
ON public.scheduled_telegram_posts 
FOR SELECT 
USING (true);-- Create profiles table for user data
create table public.profiles (
  id uuid not null references auth.users on delete cascade primary key,
  email text,
  full_name text,
  telegram_bot_token text,
  telegram_channel_id text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Users can view their own profile" 
on public.profiles 
for select 
using (auth.uid() = id);

create policy "Users can update their own profile" 
on public.profiles 
for update 
using (auth.uid() = id);

create policy "Users can insert their own profile" 
on public.profiles 
for insert 
with check (auth.uid() = id);

-- Function to handle new user creation
-- This function creates a profile, assigns free plan, and initializes usage tracking
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_free_plan_id uuid;
begin
  -- 1. Create user profile
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');

  -- 2. Get the free plan ID
  select id into v_free_plan_id
  from public.subscription_plans
  where name = 'free' and is_active = true
  limit 1;

  -- 3. Create subscription with free plan (if free plan exists)
  if v_free_plan_id is not null then
    insert into public.subscriptions (
      user_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end
    )
    values (
      new.id,
      v_free_plan_id,
      'active',
      now(),
      now() + interval '100 years', -- Free plan never expires
      false
    );

    -- 4. Initialize usage tracking
    insert into public.usage_tracking (
      user_id,
      quizzes_generated_this_month,
      pdfs_uploaded_this_month,
      total_quizzes_generated,
      total_pdfs_uploaded,
      total_storage_used_bytes,
      current_period_start,
      last_reset_at
    )
    values (
      new.id,
      0,
      0,
      0,
      0,
      0,
      now(),
      now()
    );
  end if;

  return new;
end;
$$;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;-- Fix search_path for handle_updated_at function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add trigger for updated_at on profiles table
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();-- =============================================
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
  ('enterprise', 'Enterprise', 999.00, NULL, 1000, NULL, 1000, 1000000, true, true, true, true, true, true, true, true, true, true)
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
-- =============================================
-- SCHEDULER CRON JOB & EDGE FUNCTION
-- =============================================
-- This migration sets up the cron job to automatically
-- send scheduled Telegram quiz posts
-- =============================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to process scheduled posts
CREATE OR REPLACE FUNCTION process_scheduled_telegram_posts()
RETURNS void AS $$
DECLARE
  scheduled_post RECORD;
  function_url TEXT;
BEGIN
  -- Get Supabase project URL from environment or use default
  function_url := current_setting('app.supabase_url', true) || '/functions/v1/send-telegram-quiz';

  -- Process all pending posts that are due
  FOR scheduled_post IN
    SELECT *
    FROM public.scheduled_telegram_posts
    WHERE status = 'pending'
    AND scheduled_time <= now()
    ORDER BY scheduled_time ASC
    LIMIT 50 -- Process max 50 posts per run
  LOOP
    BEGIN
      -- Update status to prevent duplicate processing
      UPDATE public.scheduled_telegram_posts
      SET status = 'processing'
      WHERE id = scheduled_post.id;

      -- Call the edge function using http extension
      -- Note: This requires the http extension and proper configuration
      -- For production, consider using Supabase Edge Functions with webhooks

      -- For now, we'll mark it as ready to send and let the edge function handle it
      -- The actual sending will be done by the send-telegram-quiz edge function

      -- Log the attempt
      RAISE NOTICE 'Processing scheduled post: %', scheduled_post.id;

    EXCEPTION WHEN OTHERS THEN
      -- If error, mark as failed
      UPDATE public.scheduled_telegram_posts
      SET
        status = 'failed',
        error_message = SQLERRM
      WHERE id = scheduled_post.id;

      RAISE WARNING 'Failed to process scheduled post %: %', scheduled_post.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to postgres role
GRANT EXECUTE ON FUNCTION process_scheduled_telegram_posts() TO postgres;

-- Schedule the cron job to run every minute
-- Note: pg_cron needs to be enabled in Supabase dashboard first
SELECT cron.schedule(
  'process-scheduled-telegram-posts',  -- Job name
  '* * * * *',                         -- Every minute
  $$SELECT process_scheduled_telegram_posts()$$
);

-- Alternative: Create a simple trigger-based approach
-- This doesn't require pg_cron but requires manual triggering

CREATE OR REPLACE FUNCTION trigger_scheduled_post_processing()
RETURNS trigger AS $$
BEGIN
  -- When a new scheduled post is inserted, check if it should be sent immediately
  IF NEW.scheduled_time <= now() AND NEW.status = 'pending' THEN
    -- In a real implementation, this would trigger an edge function
    -- For now, we just log it
    RAISE NOTICE 'Scheduled post % is ready to send', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_scheduled_post_insert
  AFTER INSERT ON public.scheduled_telegram_posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_scheduled_post_processing();

-- =============================================
-- HELPFUL QUERIES FOR MONITORING
-- =============================================

-- View to see pending scheduled posts
CREATE OR REPLACE VIEW scheduled_posts_status AS
SELECT
  id,
  user_id,
  chat_id,
  scheduled_time,
  status,
  error_message,
  created_at,
  CASE
    WHEN scheduled_time <= now() AND status = 'pending' THEN 'READY_TO_SEND'
    WHEN scheduled_time > now() AND status = 'pending' THEN 'WAITING'
    ELSE status
  END as current_status,
  EXTRACT(EPOCH FROM (scheduled_time - now())) as seconds_until_send
FROM public.scheduled_telegram_posts
ORDER BY scheduled_time ASC;

-- Grant access to the view
GRANT SELECT ON scheduled_posts_status TO authenticated;

-- =============================================
-- MANUAL TRIGGER FUNCTION (for testing)
-- =============================================

CREATE OR REPLACE FUNCTION manually_trigger_scheduler()
RETURNS TABLE (
  processed_count INTEGER,
  failed_count INTEGER,
  details JSONB
) AS $$
DECLARE
  processed INT := 0;
  failed INT := 0;
  result_details JSONB := '[]'::jsonb;
BEGIN
  -- Call the processing function
  PERFORM process_scheduled_telegram_posts();

  -- Count results
  SELECT COUNT(*) INTO processed
  FROM public.scheduled_telegram_posts
  WHERE status = 'sent' AND sent_at > now() - INTERVAL '5 minutes';

  SELECT COUNT(*) INTO failed
  FROM public.scheduled_telegram_posts
  WHERE status = 'failed' AND updated_at > now() - INTERVAL '5 minutes';

  -- Return results
  RETURN QUERY SELECT processed, failed, result_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION manually_trigger_scheduler() IS 'Manually trigger the scheduler for testing purposes';
-- Add min_questions_per_interval column to scheduled_telegram_posts table
-- This allows users to specify minimum number of questions per post interval

ALTER TABLE scheduled_telegram_posts
ADD COLUMN min_questions_per_interval INTEGER DEFAULT 1;

-- Add comment to explain the column
COMMENT ON COLUMN scheduled_telegram_posts.min_questions_per_interval IS 'Minimum number of questions to include in each post interval. Default is 1 (one question per interval). Users can set this to 5, 10, 15, or custom number to group multiple questions per scheduled post.';

-- Create index for queries that filter by this column
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_min_questions ON scheduled_telegram_posts(min_questions_per_interval);
-- =============================================
-- STORAGE CONFIGURATION FOR DOCUMENTS
-- =============================================

-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB max file size
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create logos storage bucket for custom branding
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880, -- 5MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for logos bucket
CREATE POLICY "Users can upload their own logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

CREATE POLICY "Users can update their own logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
-- Migration: Channel-Specific Knowledge Bases
-- Description: Adds support for multiple channels per user with isolated knowledge bases

-- Create channels table
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    telegram_channel_id TEXT,
    telegram_bot_token TEXT,
    description TEXT,

    -- Channel-specific settings for auto quiz generation
    settings JSONB DEFAULT '{
        "auto_generate_quizzes": false,
        "default_subject": "",
        "default_difficulty": "medium",
        "default_language": "en",
        "questions_per_quiz": 10,
        "generation_frequency": "daily",
        "system_prompt": ""
    }'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_channel_name UNIQUE(user_id, name)
);

-- Add indexes for channels
CREATE INDEX idx_channels_user_id ON public.channels(user_id);
CREATE INDEX idx_channels_telegram_channel_id ON public.channels(telegram_channel_id);

-- Enable RLS for channels
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channels
CREATE POLICY "Users can view their own channels"
    ON public.channels FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own channels"
    ON public.channels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channels"
    ON public.channels FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own channels"
    ON public.channels FOR DELETE
    USING (auth.uid() = user_id);

-- Add channel_id to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;

-- Add index for channel_id in documents
CREATE INDEX IF NOT EXISTS idx_documents_channel_id ON public.documents(channel_id);

-- Add channel_id to quiz_generations table
ALTER TABLE public.quiz_generations
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;

-- Add index for channel_id in quiz_generations
CREATE INDEX IF NOT EXISTS idx_quiz_generations_channel_id ON public.quiz_generations(channel_id);

-- Add channel_id to question_banks table
ALTER TABLE public.question_banks
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;

-- Add index for channel_id in question_banks
CREATE INDEX IF NOT EXISTS idx_question_banks_channel_id ON public.question_banks(channel_id);

-- Update trigger for channels
CREATE OR REPLACE FUNCTION public.handle_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channels_updated_at
    BEFORE UPDATE ON public.channels
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_channels_updated_at();

-- Migration data: Create default channel for existing users with telegram config
INSERT INTO public.channels (user_id, name, telegram_channel_id, telegram_bot_token, description, settings)
SELECT
    id as user_id,
    'Default Channel' as name,
    telegram_channel_id,
    telegram_bot_token,
    'Migrated from profile settings' as description,
    '{
        "auto_generate_quizzes": false,
        "default_subject": "",
        "default_difficulty": "medium",
        "default_language": "bn",
        "questions_per_quiz": 10,
        "generation_frequency": "daily",
        "system_prompt": ""
    }'::jsonb as settings
FROM public.profiles
WHERE telegram_channel_id IS NOT NULL OR telegram_bot_token IS NOT NULL
ON CONFLICT DO NOTHING;

-- Update existing documents to link to default channel
UPDATE public.documents d
SET channel_id = (
    SELECT c.id
    FROM public.channels c
    WHERE c.user_id = d.user_id
    AND c.name = 'Default Channel'
    LIMIT 1
)
WHERE channel_id IS NULL;

-- Update existing quiz_generations to link to default channel
UPDATE public.quiz_generations qg
SET channel_id = (
    SELECT c.id
    FROM public.channels c
    WHERE c.user_id = qg.user_id
    AND c.name = 'Default Channel'
    LIMIT 1
)
WHERE channel_id IS NULL;

-- Update existing question_banks to link to default channel
UPDATE public.question_banks qb
SET channel_id = (
    SELECT c.id
    FROM public.channels c
    WHERE c.user_id = qb.user_id
    AND c.name = 'Default Channel'
    LIMIT 1
)
WHERE channel_id IS NULL;

-- Add helpful comments
COMMENT ON TABLE public.channels IS 'Stores Telegram channels with isolated knowledge bases for each channel';
COMMENT ON COLUMN public.channels.settings IS 'JSON settings for auto quiz generation: auto_generate_quizzes, default_subject, default_difficulty, default_language, questions_per_quiz, generation_frequency, system_prompt';
COMMENT ON COLUMN public.documents.channel_id IS 'Links document to specific channel for isolated knowledge base';
COMMENT ON COLUMN public.quiz_generations.channel_id IS 'Links quiz to specific channel';
COMMENT ON COLUMN public.question_banks.channel_id IS 'Links question to specific channel knowledge base';
-- =============================================
-- SUPER ADMIN ROLES & PERMISSIONS
-- =============================================
-- This migration adds role-based access control with super admin capabilities

-- Add role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
CHECK (role IN ('user', 'admin', 'super_admin'));

-- Add can_purchase_plans flag to control who can buy subscriptions
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS can_purchase_plans BOOLEAN NOT NULL DEFAULT true;

-- Add index for role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =============================================
-- ADMIN ACCESS RLS POLICIES
-- =============================================

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or super admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SUPER ADMIN POLICIES FOR PROFILES TABLE
-- =============================================

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING (
  is_super_admin(auth.uid()) OR auth.uid() = id
);

-- Super admins can update all profiles (to manage roles and permissions)
CREATE POLICY "Super admins can update all profiles"
ON public.profiles FOR UPDATE
USING (
  is_super_admin(auth.uid()) OR auth.uid() = id
);

-- =============================================
-- SUPER ADMIN POLICIES FOR SUBSCRIPTIONS
-- =============================================

-- Super admins can view all subscriptions
CREATE POLICY "Super admins can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (
  is_super_admin(auth.uid()) OR auth.uid() = user_id
);

-- Super admins can update all subscriptions
CREATE POLICY "Super admins can update all subscriptions"
ON public.subscriptions FOR UPDATE
USING (
  is_super_admin(auth.uid()) OR auth.uid() = user_id
);

-- Super admins can delete subscriptions
CREATE POLICY "Super admins can delete subscriptions"
ON public.subscriptions FOR DELETE
USING (
  is_super_admin(auth.uid())
);

-- =============================================
-- SUPER ADMIN POLICIES FOR USAGE TRACKING
-- =============================================

-- Super admins can view all usage tracking
CREATE POLICY "Super admins can view all usage tracking"
ON public.usage_tracking FOR SELECT
USING (
  is_super_admin(auth.uid()) OR auth.uid() = user_id
);

-- =============================================
-- SUPER ADMIN POLICIES FOR OTHER TABLES
-- =============================================

-- Admins can view all channels
CREATE POLICY "Admins can view all channels"
ON public.channels FOR SELECT
USING (
  is_admin(auth.uid()) OR auth.uid() = user_id
);

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON public.documents FOR SELECT
USING (
  is_admin(auth.uid()) OR auth.uid() = user_id
);

-- Admins can view all quiz generations
CREATE POLICY "Admins can view all quiz generations"
ON public.quiz_generations FOR SELECT
USING (
  is_admin(auth.uid()) OR auth.uid() = user_id
);

-- Admins can view all question banks
CREATE POLICY "Admins can view all question_banks"
ON public.question_banks FOR SELECT
USING (
  is_admin(auth.uid()) OR auth.uid() = user_id OR is_public = true
);

-- =============================================
-- ADMIN ACTIVITY LOG TABLE
-- =============================================

-- Create admin activity log to track admin actions
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'update_role', 'toggle_purchase_permission', 'view_user', etc.
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_activity_admin_id ON public.admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_target_user ON public.admin_activity_log(target_user_id);
CREATE INDEX idx_admin_activity_created_at ON public.admin_activity_log(created_at DESC);

-- Enable RLS for admin activity log
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity log
CREATE POLICY "Admins can view activity log"
ON public.admin_activity_log FOR SELECT
USING (is_admin(auth.uid()));

-- Only admins can insert activity log
CREATE POLICY "Admins can insert activity log"
ON public.admin_activity_log FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- HELPER FUNCTIONS FOR ADMIN OPERATIONS
-- =============================================

-- Function to update user role (admin only)
CREATE OR REPLACE FUNCTION admin_update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can update user roles';
  END IF;

  -- Validate role
  IF new_role NOT IN ('user', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  -- Update role
  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;

  -- Log activity
  INSERT INTO public.admin_activity_log (admin_id, action, target_user_id, details)
  VALUES (
    auth.uid(),
    'update_role',
    target_user_id,
    jsonb_build_object('new_role', new_role)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle purchase permission (super admin only)
CREATE OR REPLACE FUNCTION admin_toggle_purchase_permission(
  target_user_id UUID,
  can_purchase BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can toggle purchase permissions';
  END IF;

  -- Update permission
  UPDATE public.profiles
  SET can_purchase_plans = can_purchase
  WHERE id = target_user_id;

  -- Log activity
  INSERT INTO public.admin_activity_log (admin_id, action, target_user_id, details)
  VALUES (
    auth.uid(),
    'toggle_purchase_permission',
    target_user_id,
    jsonb_build_object('can_purchase_plans', can_purchase)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN public.profiles.role IS 'User role: user, admin, or super_admin';
COMMENT ON COLUMN public.profiles.can_purchase_plans IS 'Whether user is allowed to purchase subscription plans';
COMMENT ON FUNCTION is_super_admin IS 'Check if user has super_admin role';
COMMENT ON FUNCTION is_admin IS 'Check if user has admin or super_admin role';
COMMENT ON FUNCTION admin_update_user_role IS 'Super admin function to update user roles';
COMMENT ON FUNCTION admin_toggle_purchase_permission IS 'Super admin function to control purchase permissions';
COMMENT ON TABLE public.admin_activity_log IS 'Audit log for admin actions';
-- =============================================
-- AUTO-GENERATE CHANNEL QUIZZES CRON JOB
-- =============================================
-- This migration sets up the cron job to automatically
-- generate quizzes for channels with auto_generate_quizzes enabled
-- =============================================

-- Ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to trigger auto-generation
-- This function calls the auto-generate-channel-quizzes edge function
CREATE OR REPLACE FUNCTION trigger_auto_generate_channel_quizzes()
RETURNS void AS $$
DECLARE
  channel RECORD;
  channels_processed INT := 0;
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'Auto-generate channel quizzes triggered at %', now();

  -- Count channels that need processing
  SELECT COUNT(*) INTO channels_processed
  FROM public.channels
  WHERE (settings->>'auto_generate_quizzes')::boolean = true
    AND telegram_channel_id IS NOT NULL
    AND telegram_bot_token IS NOT NULL;

  RAISE NOTICE 'Found % channels configured for auto-generation', channels_processed;

  -- The actual processing is done by the edge function
  -- This function is mainly for logging and monitoring purposes
  -- The edge function will be called via Supabase scheduled functions or webhooks
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION trigger_auto_generate_channel_quizzes() TO postgres;

-- Schedule the cron job to run every hour
-- Channels with different frequencies (daily, weekly, etc.) are handled in the edge function
SELECT cron.schedule(
  'auto-generate-channel-quizzes',  -- Job name
  '0 * * * *',                       -- Every hour at minute 0
  $$SELECT trigger_auto_generate_channel_quizzes()$$
);

-- =============================================
-- TRACKING TABLE FOR AUTO-GENERATION
-- =============================================

-- Add last_auto_generated_at to channels for tracking
ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS last_auto_generated_at TIMESTAMPTZ;

-- Add index for efficient querying of channels needing generation
CREATE INDEX IF NOT EXISTS idx_channels_auto_generate
ON public.channels ((settings->>'auto_generate_quizzes'))
WHERE (settings->>'auto_generate_quizzes')::boolean = true;

-- =============================================
-- VIEW FOR MONITORING AUTO-GENERATION
-- =============================================

CREATE OR REPLACE VIEW auto_generation_status AS
SELECT
  c.id,
  c.name,
  c.user_id,
  c.settings->>'default_subject' as subject,
  c.settings->>'generation_frequency' as frequency,
  c.settings->>'questions_per_quiz' as questions_per_quiz,
  c.last_auto_generated_at,
  (SELECT MAX(created_at) FROM quiz_generations WHERE channel_id = c.id) as last_quiz_at,
  (SELECT COUNT(*) FROM quiz_generations WHERE channel_id = c.id) as total_quizzes,
  (SELECT COUNT(*) FROM documents WHERE channel_id = c.id AND processing_status = 'completed') as document_count,
  CASE
    WHEN c.telegram_channel_id IS NULL OR c.telegram_bot_token IS NULL THEN 'MISSING_TELEGRAM'
    WHEN c.settings->>'system_prompt' = '' OR c.settings->>'system_prompt' IS NULL THEN 'MISSING_PROMPT'
    WHEN c.settings->>'default_subject' = '' OR c.settings->>'default_subject' IS NULL THEN 'MISSING_SUBJECT'
    ELSE 'READY'
  END as configuration_status,
  CASE
    WHEN c.last_auto_generated_at IS NULL THEN 'NEVER_GENERATED'
    WHEN c.settings->>'generation_frequency' = 'daily' AND c.last_auto_generated_at < now() - INTERVAL '24 hours' THEN 'DUE'
    WHEN c.settings->>'generation_frequency' = 'weekly' AND c.last_auto_generated_at < now() - INTERVAL '7 days' THEN 'DUE'
    WHEN c.settings->>'generation_frequency' = 'bi-weekly' AND c.last_auto_generated_at < now() - INTERVAL '14 days' THEN 'DUE'
    WHEN c.settings->>'generation_frequency' = 'monthly' AND c.last_auto_generated_at < now() - INTERVAL '30 days' THEN 'DUE'
    ELSE 'UP_TO_DATE'
  END as generation_status
FROM public.channels c
WHERE (c.settings->>'auto_generate_quizzes')::boolean = true
ORDER BY c.last_auto_generated_at ASC NULLS FIRST;

-- Grant access to the view
GRANT SELECT ON auto_generation_status TO authenticated;

-- =============================================
-- MANUAL TRIGGER FUNCTION (for testing)
-- =============================================

CREATE OR REPLACE FUNCTION manually_trigger_auto_generation(target_channel_id UUID DEFAULT NULL)
RETURNS TABLE (
  channel_id UUID,
  channel_name TEXT,
  status TEXT,
  message TEXT
) AS $$
BEGIN
  -- This is a placeholder for manual triggering
  -- The actual generation is done by the edge function

  IF target_channel_id IS NOT NULL THEN
    -- Return status for specific channel
    RETURN QUERY
    SELECT
      c.id,
      c.name,
      'TRIGGERED'::TEXT,
      'Manual generation triggered for channel'::TEXT
    FROM public.channels c
    WHERE c.id = target_channel_id
      AND (c.settings->>'auto_generate_quizzes')::boolean = true;
  ELSE
    -- Return status for all auto-generate channels
    RETURN QUERY
    SELECT
      c.id,
      c.name,
      'TRIGGERED'::TEXT,
      'Manual generation triggered for all channels'::TEXT
    FROM public.channels c
    WHERE (c.settings->>'auto_generate_quizzes')::boolean = true
      AND c.telegram_channel_id IS NOT NULL
      AND c.telegram_bot_token IS NOT NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION manually_trigger_auto_generation(UUID) IS 'Manually trigger auto-generation for testing. Call the edge function for actual generation.';

-- =============================================
-- FUNCTION TO UPDATE LAST GENERATION TIME
-- =============================================

CREATE OR REPLACE FUNCTION update_channel_last_generated()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the channel's last_auto_generated_at when a quiz is generated
  IF NEW.channel_id IS NOT NULL AND NEW.delivery_method = 'telegram' THEN
    UPDATE public.channels
    SET last_auto_generated_at = NEW.created_at
    WHERE id = NEW.channel_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last generation time
CREATE TRIGGER on_quiz_generated
  AFTER INSERT ON public.quiz_generations
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_last_generated();

-- =============================================
-- RLS POLICIES FOR AUTO-GENERATION VIEW
-- =============================================

-- Ensure users can only see their own channel status
CREATE POLICY "Users can view their own auto-generation status"
ON public.channels
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

COMMENT ON VIEW auto_generation_status IS 'View showing the auto-generation status for all configured channels';
-- =============================================
-- SETUP SUPER ADMIN AND PRO PLAN FOR SUSANTALOHR@GMAIL.COM
-- =============================================
-- This migration sets up the initial super admin user with Pro plan

-- Note: This migration uses a DO block to handle the case where the user might not exist yet
-- If the user doesn't exist, they will be granted super admin and pro plan upon first login

DO $$
DECLARE
  target_user_id UUID;
  pro_plan_id UUID;
BEGIN
  -- Get the Pro plan ID
  SELECT id INTO pro_plan_id
  FROM public.subscription_plans
  WHERE name = 'pro'
  LIMIT 1;

  IF pro_plan_id IS NULL THEN
    RAISE EXCEPTION 'Pro plan not found. Please ensure premium_features_schema migration has run.';
  END IF;

  -- Try to find the user by email in auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'susantalohr@gmail.com'
  LIMIT 1;

  -- If user exists, update their profile and subscription
  IF target_user_id IS NOT NULL THEN
    -- Ensure profile exists
    INSERT INTO public.profiles (id, email, role, can_purchase_plans)
    VALUES (target_user_id, 'susantalohr@gmail.com', 'super_admin', true)
    ON CONFLICT (id) DO UPDATE
    SET
      role = 'super_admin',
      can_purchase_plans = true,
      updated_at = now();

    -- Create or update subscription to Pro plan
    INSERT INTO public.subscriptions (
      user_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end
    )
    VALUES (
      target_user_id,
      pro_plan_id,
      'active',
      now(),
      now() + INTERVAL '1 year', -- 1 year subscription
      false
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      plan_id = pro_plan_id,
      status = 'active',
      current_period_start = now(),
      current_period_end = now() + INTERVAL '1 year',
      cancel_at_period_end = false,
      updated_at = now();

    -- Initialize usage tracking
    INSERT INTO public.usage_tracking (
      user_id,
      quizzes_generated_this_month,
      pdfs_uploaded_this_month,
      total_quizzes_generated,
      total_pdfs_uploaded,
      total_storage_used_bytes,
      current_period_start,
      last_reset_at
    )
    VALUES (
      target_user_id,
      0,
      0,
      0,
      0,
      0,
      now(),
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Successfully set up super admin and Pro plan for susantalohr@gmail.com (User ID: %)', target_user_id;
  ELSE
    -- User doesn't exist yet, create a function to auto-setup when they sign up
    RAISE NOTICE 'User susantalohr@gmail.com not found. Will be set up automatically upon first login.';
  END IF;
END $$;

-- =============================================
-- TRIGGER TO AUTO-SETUP SUPER ADMIN ON SIGNUP
-- =============================================

-- Function to auto-setup specific users with super admin and pro plan
CREATE OR REPLACE FUNCTION auto_setup_super_admin()
RETURNS TRIGGER AS $$
DECLARE
  pro_plan_id UUID;
BEGIN
  -- Check if this is the designated super admin email
  IF NEW.email = 'susantalohr@gmail.com' THEN
    -- Get Pro plan ID
    SELECT id INTO pro_plan_id
    FROM public.subscription_plans
    WHERE name = 'pro'
    LIMIT 1;

    IF pro_plan_id IS NOT NULL THEN
      -- Update profile to super admin
      UPDATE public.profiles
      SET
        role = 'super_admin',
        can_purchase_plans = true
      WHERE id = NEW.id;

      -- Create Pro subscription
      INSERT INTO public.subscriptions (
        user_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end
      )
      VALUES (
        NEW.id,
        pro_plan_id,
        'active',
        now(),
        now() + INTERVAL '1 year',
        false
      )
      ON CONFLICT (user_id) DO NOTHING;

      -- Initialize usage tracking
      INSERT INTO public.usage_tracking (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;

      RAISE NOTICE 'Auto-setup completed for super admin: %', NEW.email;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table to auto-setup on insert
DROP TRIGGER IF EXISTS trigger_auto_setup_super_admin ON public.profiles;
CREATE TRIGGER trigger_auto_setup_super_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_setup_super_admin();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION auto_setup_super_admin IS 'Automatically sets up super admin role and Pro plan for designated users on signup';
COMMENT ON TRIGGER trigger_auto_setup_super_admin ON public.profiles IS 'Triggers auto-setup for designated super admin users';
-- Security Enhancements Migration
-- Adds additional security features and audit trails

-- Add security-related columns to admin_activity_log if not exists
DO $$
BEGIN
    -- Add IP address tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'admin_activity_log' AND column_name = 'ip_address') THEN
        ALTER TABLE admin_activity_log ADD COLUMN ip_address TEXT;
    END IF;

    -- Add user agent tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'admin_activity_log' AND column_name = 'user_agent') THEN
        ALTER TABLE admin_activity_log ADD COLUMN user_agent TEXT;
    END IF;

    -- Add session ID for tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'admin_activity_log' AND column_name = 'session_id') THEN
        ALTER TABLE admin_activity_log ADD COLUMN session_id TEXT;
    END IF;
END $$;

-- Create security_alerts table for tracking security incidents
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::jsonb,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on security alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

-- Enable RLS on security_alerts
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can view security alerts
CREATE POLICY "Admins can view security alerts"
    ON security_alerts FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));

-- Only super admins can insert security alerts
CREATE POLICY "Super admins can insert security alerts"
    ON security_alerts FOR INSERT
    TO authenticated
    WITH CHECK (is_super_admin(auth.uid()));

-- Only super admins can update security alerts
CREATE POLICY "Super admins can update security alerts"
    ON security_alerts FOR UPDATE
    TO authenticated
    USING (is_super_admin(auth.uid()));

-- Create login_attempts table for tracking failed logins
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address TEXT,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for login_attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success);

-- Enable RLS on login_attempts
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempts
CREATE POLICY "Admins can view login attempts"
    ON login_attempts FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));

-- Function to clean old login attempts (keep only last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM login_attempts
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create session_tracking table for monitoring active sessions
CREATE TABLE IF NOT EXISTS session_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    last_activity TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for session_tracking
CREATE INDEX IF NOT EXISTS idx_session_tracking_user_id ON session_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_session_tracking_session_token ON session_tracking(session_token);
CREATE INDEX IF NOT EXISTS idx_session_tracking_is_active ON session_tracking(is_active);

-- Enable RLS on session_tracking
ALTER TABLE session_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
    ON session_tracking FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
    ON session_tracking FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));

-- Users can insert their own sessions
CREATE POLICY "Users can insert their own sessions"
    ON session_tracking FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update their own sessions"
    ON session_tracking FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Function to invalidate old sessions (24 hours)
CREATE OR REPLACE FUNCTION invalidate_old_sessions()
RETURNS void AS $$
BEGIN
    UPDATE session_tracking
    SET is_active = FALSE
    WHERE last_activity < NOW() - INTERVAL '24 hours'
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add user status column to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'status') THEN
        ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'banned'));
    END IF;
END $$;

-- Add last_login column to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'last_login') THEN
        ALTER TABLE profiles ADD COLUMN last_login TIMESTAMPTZ;
    END IF;
END $$;

-- Add login_count column to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'login_count') THEN
        ALTER TABLE profiles ADD COLUMN login_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create function to update last login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET
        last_login = NOW(),
        login_count = COALESCE(login_count, 0) + 1
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update last login on auth
CREATE OR REPLACE TRIGGER on_auth_login
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION update_last_login();

-- Create function for super admins to suspend users
CREATE OR REPLACE FUNCTION admin_suspend_user(target_user_id UUID, reason TEXT)
RETURNS void AS $$
BEGIN
    -- Check if caller is super admin
    IF NOT is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only super admins can suspend users';
    END IF;

    -- Update user status
    UPDATE profiles
    SET status = 'suspended'
    WHERE id = target_user_id;

    -- Log the action
    INSERT INTO admin_activity_log (admin_id, action, target_user_id, details)
    VALUES (
        auth.uid(),
        'suspend_user',
        target_user_id,
        jsonb_build_object('reason', reason, 'timestamp', NOW())
    );

    -- Invalidate all user sessions
    UPDATE session_tracking
    SET is_active = FALSE
    WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for super admins to unsuspend users
CREATE OR REPLACE FUNCTION admin_unsuspend_user(target_user_id UUID, reason TEXT)
RETURNS void AS $$
BEGIN
    -- Check if caller is super admin
    IF NOT is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only super admins can unsuspend users';
    END IF;

    -- Update user status
    UPDATE profiles
    SET status = 'active'
    WHERE id = target_user_id;

    -- Log the action
    INSERT INTO admin_activity_log (admin_id, action, target_user_id, details)
    VALUES (
        auth.uid(),
        'unsuspend_user',
        target_user_id,
        jsonb_build_object('reason', reason, 'timestamp', NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is suspended
CREATE OR REPLACE FUNCTION is_user_suspended(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id
        AND status IN ('suspended', 'banned')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy to prevent suspended users from accessing data
CREATE POLICY "Suspended users cannot access their data"
    ON profiles FOR ALL
    TO authenticated
    USING (
        auth.uid() = id
        AND NOT is_user_suspended(auth.uid())
    );

-- Create audit trail for sensitive table changes
CREATE TABLE IF NOT EXISTS data_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on data_audit_log
CREATE INDEX IF NOT EXISTS idx_data_audit_log_table_name ON data_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_record_id ON data_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_changed_at ON data_audit_log(changed_at);

-- Enable RLS on data_audit_log
ALTER TABLE data_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit log
CREATE POLICY "Super admins can view audit log"
    ON data_audit_log FOR SELECT
    TO authenticated
    USING (is_super_admin(auth.uid()));

-- Grant execute permissions on security functions to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_old_login_attempts() TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_old_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_suspend_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unsuspend_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_suspended(UUID) TO authenticated;

-- Create a cron job to clean up old data (if pg_cron is available)
-- This runs daily at midnight
SELECT cron.schedule(
    'cleanup-security-data',
    '0 0 * * *',
    $$
    SELECT cleanup_old_login_attempts();
    SELECT invalidate_old_sessions();
    DELETE FROM security_alerts WHERE resolved = TRUE AND created_at < NOW() - INTERVAL '90 days';
    DELETE FROM admin_activity_log WHERE created_at < NOW() - INTERVAL '180 days';
    $$
);

-- Add comments to tables for documentation
COMMENT ON TABLE security_alerts IS 'Tracks security incidents and alerts that require admin attention';
COMMENT ON TABLE login_attempts IS 'Tracks all login attempts (successful and failed) for security monitoring';
COMMENT ON TABLE session_tracking IS 'Tracks active user sessions for security and session management';
COMMENT ON TABLE data_audit_log IS 'Audit trail for sensitive data changes';

COMMENT ON COLUMN profiles.status IS 'User account status: active, suspended, or banned';
COMMENT ON COLUMN profiles.last_login IS 'Timestamp of user last successful login';
COMMENT ON COLUMN profiles.login_count IS 'Total number of successful logins';
