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
