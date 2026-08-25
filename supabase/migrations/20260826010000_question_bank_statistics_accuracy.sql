-- Question Bank statistics must reflect the actual active Question Bank.
-- Keep the existing RPC name so the frontend does not need to change.
-- SECURITY INVOKER preserves RLS/user isolation.

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
        SELECT q2.topic, COUNT(*)::INTEGER AS topic_count
        FROM public.question_banks q2
        WHERE q2.is_active = true
          AND CASE WHEN p_include_public
            THEN (q2.user_id = p_user_id OR q2.is_public = true)
            ELSE q2.user_id = p_user_id
          END
          AND q2.topic IS NOT NULL AND q2.topic <> ''
        GROUP BY q2.topic
      ) t
    ), '{}'::jsonb),
    'bySubject', COALESCE((
      SELECT jsonb_object_agg(subject, subject_count)
      FROM (
        SELECT q3.subject, COUNT(*)::INTEGER AS subject_count
        FROM public.question_banks q3
        WHERE q3.is_active = true
          AND CASE WHEN p_include_public
            THEN (q3.user_id = p_user_id OR q3.is_public = true)
            ELSE q3.user_id = p_user_id
          END
          AND q3.subject IS NOT NULL AND q3.subject <> ''
        GROUP BY q3.subject
      ) s
    ), '{}'::jsonb),
    'byLanguage', COALESCE((
      SELECT jsonb_object_agg(language, language_count)
      FROM (
        SELECT q4.language, COUNT(*)::INTEGER AS language_count
        FROM public.question_banks q4
        WHERE q4.is_active = true
          AND CASE WHEN p_include_public
            THEN (q4.user_id = p_user_id OR q4.is_public = true)
            ELSE q4.user_id = p_user_id
          END
          AND q4.language IS NOT NULL AND q4.language <> ''
        GROUP BY q4.language
      ) l
    ), '{}'::jsonb),
    'unclassifiedCount', COUNT(*) FILTER (WHERE subject IS NULL OR subject = '')::INTEGER,
    'publicCount', COUNT(*) FILTER (WHERE is_public = true)::INTEGER,
    'privateCount', COUNT(*) FILTER (WHERE is_public = false)::INTEGER
  )
  INTO result
  FROM public.question_banks q
  WHERE q.is_active = true
    AND CASE
      WHEN p_include_public THEN (q.user_id = p_user_id OR q.is_public = true)
      ELSE q.user_id = p_user_id
    END;

  RETURN result;
END;
$$;
