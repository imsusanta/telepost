-- Knowledge Base Topics table
CREATE TABLE IF NOT EXISTS public.knowledge_base_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  topic_name TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  language TEXT DEFAULT 'bn',
  ai_instructions TEXT,
  exam TEXT,
  grade TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_topics_user_id ON public.knowledge_base_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_topics_subject ON public.knowledge_base_topics(subject);
CREATE INDEX IF NOT EXISTS idx_kb_topics_language ON public.knowledge_base_topics(language);
CREATE INDEX IF NOT EXISTS idx_kb_topics_channel_id ON public.knowledge_base_topics(channel_id);

-- RLS
ALTER TABLE public.knowledge_base_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_topics_select_own" ON public.knowledge_base_topics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "kb_topics_insert_own" ON public.knowledge_base_topics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kb_topics_update_own" ON public.knowledge_base_topics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "kb_topics_delete_own" ON public.knowledge_base_topics
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_kb_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_topics_updated_at
  BEFORE UPDATE ON public.knowledge_base_topics
  FOR EACH ROW EXECUTE FUNCTION update_kb_topics_updated_at();

-- User AI System Prompts table
CREATE TABLE IF NOT EXISTS public.user_ai_system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  system_prompt TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_ai_system_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_prompts_select_own" ON public.user_ai_system_prompts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_prompts_insert_own" ON public.user_ai_system_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_prompts_update_own" ON public.user_ai_system_prompts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER user_prompts_updated_at
  BEFORE UPDATE ON public.user_ai_system_prompts
  FOR EACH ROW EXECUTE FUNCTION update_kb_topics_updated_at();
