-- The table existed before the topic-based Knowledge Base was introduced.
-- `CREATE TABLE IF NOT EXISTS` intentionally left that legacy schema intact,
-- so add the new fields in place and preserve its existing topic data.
ALTER TABLE public.knowledge_base_topics
  ADD COLUMN IF NOT EXISTS topic_name TEXT,
  ADD COLUMN IF NOT EXISTS ai_instructions TEXT,
  ADD COLUMN IF NOT EXISTS exam TEXT,
  ADD COLUMN IF NOT EXISTS grade TEXT;

UPDATE public.knowledge_base_topics
SET
  topic_name = COALESCE(topic_name, topic),
  ai_instructions = COALESCE(ai_instructions, prompt_context)
WHERE topic_name IS NULL OR ai_instructions IS NULL;

ALTER TABLE public.knowledge_base_topics
  ALTER COLUMN topic_name SET NOT NULL,
  ALTER COLUMN topic DROP NOT NULL;
