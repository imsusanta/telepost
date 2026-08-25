-- Question Bank architecture hardening
-- 1) Difficulty is no longer a Question Bank dimension. The legacy column is
--    intentionally retained for backward compatibility with old rows/migrations,
--    but application writes/filters no longer use it.
-- 2) Move expensive statistics/random selection into PostgreSQL.
-- 3) Add indexes for the actual production query patterns.

COMMENT ON COLUMN public.question_banks.difficulty IS
'LEGACY/DEPRECATED: TelePost now generates standard government-competitive-exam questions automatically. New application code must not write or filter this column.';

-- Search acceleration. pg_trgm is available on standard Supabase Postgres.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_question_banks_question_trgm
ON public.question_banks USING gin (question gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_question_banks_user_subject_topic_language_created
ON public.question_banks (user_id, subject, topic, language, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_question_banks_public_subject_topic_language_created
ON public.question_banks (subject, topic, language, created_at DESC)
WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_question_banks_active_created
ON public.question_banks (is_active, created_at DESC);

-- Database-side aggregate statistics. RLS still controls the underlying table
-- because this function intentionally runs as the caller.
CREATE OR REPLACE FUNCTION public.question_bank_statistics(
  p_user_id UUID,
  p_include_public BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*)::INTEGER,
    'byTopic', COALESCE((
      SELECT jsonb_object_agg(topic, topic_count)
      FROM (
        SELECT topic, COUNT(*)::INTEGER AS topic_count
        FROM public.question_banks q2
        WHERE (CASE WHEN p_include_public THEN (q2.user_id = p_user_id OR q2.is_public = true)
                    ELSE q2.user_id = p_user_id END)
          AND q2.topic IS NOT NULL AND q2.topic <> ''
        GROUP BY topic
      ) t
    ), '{}'::jsonb),
    'bySubject', COALESCE((
      SELECT jsonb_object_agg(subject, subject_count)
      FROM (
        SELECT subject, COUNT(*)::INTEGER AS subject_count
        FROM public.question_banks q3
        WHERE (CASE WHEN p_include_public THEN (q3.user_id = p_user_id OR q3.is_public = true)
                    ELSE q3.user_id = p_user_id END)
          AND q3.subject IS NOT NULL AND q3.subject <> ''
        GROUP BY subject
      ) s
    ), '{}'::jsonb),
    'byLanguage', COALESCE((
      SELECT jsonb_object_agg(language, language_count)
      FROM (
        SELECT language, COUNT(*)::INTEGER AS language_count
        FROM public.question_banks q4
        WHERE (CASE WHEN p_include_public THEN (q4.user_id = p_user_id OR q4.is_public = true)
                    ELSE q4.user_id = p_user_id END)
          AND q4.language IS NOT NULL AND q4.language <> ''
        GROUP BY language
      ) l
    ), '{}'::jsonb),
    'unclassifiedCount', COUNT(*) FILTER (WHERE subject IS NULL OR subject = '')::INTEGER,
    'publicCount', COUNT(*) FILTER (WHERE is_public = true)::INTEGER,
    'privateCount', COUNT(*) FILTER (WHERE is_public = false)::INTEGER
  )
  INTO result
  FROM public.question_banks q
  WHERE CASE
    WHEN p_include_public THEN (q.user_id = p_user_id OR q.is_public = true)
    ELSE q.user_id = p_user_id
  END;

  RETURN result;
END;
$$;

-- Database-side random selection. This prevents the client from downloading
-- thousands of rows merely to shuffle and pick a handful.
CREATE OR REPLACE FUNCTION public.get_random_question_bank_questions(
  p_user_id UUID,
  p_count INTEGER DEFAULT 5,
  p_subject TEXT DEFAULT NULL,
  p_topic TEXT DEFAULT NULL,
  p_language TEXT DEFAULT NULL,
  p_include_public BOOLEAN DEFAULT true
)
RETURNS SETOF public.question_banks
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT q.*
  FROM public.question_banks q
  WHERE q.is_active = true
    AND CASE
      WHEN p_include_public THEN (q.user_id = p_user_id OR q.is_public = true)
      ELSE q.user_id = p_user_id
    END
    AND (p_subject IS NULL OR q.subject = p_subject)
    AND (p_topic IS NULL OR q.topic = p_topic)
    AND (p_language IS NULL OR q.language = p_language)
  ORDER BY random()
  LIMIT LEAST(GREATEST(COALESCE(p_count, 5), 1), 100);
$$;
