-- Add missing user_id column to scheduled_telegram_posts
ALTER TABLE public.scheduled_telegram_posts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for scheduled_telegram_posts
DROP POLICY IF EXISTS "Anyone can schedule posts" ON public.scheduled_telegram_posts;
DROP POLICY IF EXISTS "Anyone can view scheduled posts" ON public.scheduled_telegram_posts;

DROP POLICY IF EXISTS "Users can insert their own scheduled posts" ON public.scheduled_telegram_posts;
CREATE POLICY "Users can insert their own scheduled posts" ON public.scheduled_telegram_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own scheduled posts" ON public.scheduled_telegram_posts;
CREATE POLICY "Users can view their own scheduled posts" ON public.scheduled_telegram_posts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own scheduled posts" ON public.scheduled_telegram_posts;
CREATE POLICY "Users can update their own scheduled posts" ON public.scheduled_telegram_posts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own scheduled posts" ON public.scheduled_telegram_posts;
CREATE POLICY "Users can delete their own scheduled posts" ON public.scheduled_telegram_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Create channels table
CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  telegram_channel_id text,
  telegram_bot_token text,
  description text,
  settings jsonb DEFAULT '{}'::jsonb,
  last_auto_generated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own channels" ON public.channels;
CREATE POLICY "Users can view their own channels" ON public.channels
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own channels" ON public.channels;
CREATE POLICY "Users can insert their own channels" ON public.channels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own channels" ON public.channels;
CREATE POLICY "Users can update their own channels" ON public.channels
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own channels" ON public.channels;
CREATE POLICY "Users can delete their own channels" ON public.channels
  FOR DELETE USING (auth.uid() = user_id);

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_size_bytes bigint NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL,
  title text,
  description text,
  language text,
  page_count integer,
  word_count integer,
  processing_status text DEFAULT 'pending' NOT NULL,
  processing_error text,
  extracted_text text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert their own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- Create question_banks table
CREATE TABLE IF NOT EXISTS public.question_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_option_index integer NOT NULL,
  explanation text,
  difficulty text NOT NULL,
  topic text NOT NULL,
  tags jsonb DEFAULT '[]'::jsonb,
  source text,
  usage_count integer DEFAULT 0,
  success_rate numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own questions" ON public.question_banks;
CREATE POLICY "Users can view their own questions" ON public.question_banks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own questions" ON public.question_banks;
CREATE POLICY "Users can insert their own questions" ON public.question_banks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own questions" ON public.question_banks;
CREATE POLICY "Users can update their own questions" ON public.question_banks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own questions" ON public.question_banks;
CREATE POLICY "Users can delete their own questions" ON public.question_banks
  FOR DELETE USING (auth.uid() = user_id);

-- Create quiz_generations table
CREATE TABLE IF NOT EXISTS public.quiz_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  request_id text,
  topic text NOT NULL,
  difficulty text NOT NULL,
  question_count integer NOT NULL,
  questions jsonb NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  generation_time_ms integer,
  status text DEFAULT 'completed' NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.quiz_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own quiz generations" ON public.quiz_generations;
CREATE POLICY "Users can view their own quiz generations" ON public.quiz_generations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quiz generations" ON public.quiz_generations;
CREATE POLICY "Users can insert their own quiz generations" ON public.quiz_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  quiz_generation_id uuid REFERENCES public.quiz_generations(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own analytics" ON public.analytics_events;
CREATE POLICY "Users can view their own analytics" ON public.analytics_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analytics" ON public.analytics_events;
CREATE POLICY "Users can insert their own analytics" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create quiz_responses table
CREATE TABLE IF NOT EXISTS public.quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_generation_id uuid REFERENCES public.quiz_generations(id) ON DELETE CASCADE,
  question_index integer NOT NULL,
  selected_option_index integer NOT NULL,
  is_correct boolean NOT NULL,
  time_taken_ms integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own responses" ON public.quiz_responses;
CREATE POLICY "Users can view their own responses" ON public.quiz_responses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own responses" ON public.quiz_responses;
CREATE POLICY "Users can insert their own responses" ON public.quiz_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create leaderboards table
CREATE TABLE IF NOT EXISTS public.leaderboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  score integer DEFAULT 0 NOT NULL,
  quizzes_completed integer DEFAULT 0 NOT NULL,
  correct_answers integer DEFAULT 0 NOT NULL,
  total_answers integer DEFAULT 0 NOT NULL,
  streak_days integer DEFAULT 0 NOT NULL,
  achievements jsonb DEFAULT '[]'::jsonb,
  rank integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, channel_id)
);

ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all leaderboards" ON public.leaderboards;
CREATE POLICY "Users can view all leaderboards" ON public.leaderboards
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own leaderboard" ON public.leaderboards;
CREATE POLICY "Users can update their own leaderboard" ON public.leaderboards
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own leaderboard" ON public.leaderboards;
CREATE POLICY "Users can insert their own leaderboard" ON public.leaderboards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_monthly numeric NOT NULL,
  price_yearly numeric,
  features jsonb DEFAULT '[]'::jsonb,
  limits jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status text DEFAULT 'active' NOT NULL,
  current_period_start timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  count integer DEFAULT 1 NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own usage" ON public.usage_tracking;
CREATE POLICY "Users can view their own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert usage" ON public.usage_tracking;
CREATE POLICY "System can insert usage" ON public.usage_tracking
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update usage" ON public.usage_tracking;
CREATE POLICY "System can update usage" ON public.usage_tracking
  FOR UPDATE USING (true);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open' NOT NULL,
  priority text DEFAULT 'medium' NOT NULL,
  category text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
CREATE POLICY "Users can view their own tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;
CREATE POLICY "Users can update their own tickets" ON public.support_tickets
  FOR UPDATE USING (auth.uid() = user_id);

-- Create support_ticket_messages table
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_staff boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can view messages for their tickets" ON public.support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_ticket_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create messages for their tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can create messages for their tickets" ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_ticket_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    ) AND auth.uid() = user_id
  );

-- Create user_branding table
CREATE TABLE IF NOT EXISTS public.user_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text,
  secondary_color text,
  font_family text,
  custom_css text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE public.user_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own branding" ON public.user_branding;
CREATE POLICY "Users can view their own branding" ON public.user_branding
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own branding" ON public.user_branding;
CREATE POLICY "Users can insert their own branding" ON public.user_branding
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own branding" ON public.user_branding;
CREATE POLICY "Users can update their own branding" ON public.user_branding
  FOR UPDATE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_channels_updated_at ON public.channels;
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_question_banks_updated_at ON public.question_banks;
CREATE TRIGGER update_question_banks_updated_at
  BEFORE UPDATE ON public.question_banks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_leaderboards_updated_at ON public.leaderboards;
CREATE TRIGGER update_leaderboards_updated_at
  BEFORE UPDATE ON public.leaderboards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON public.usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_user_branding_updated_at ON public.user_branding;
CREATE TRIGGER update_user_branding_updated_at
  BEFORE UPDATE ON public.user_branding
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();