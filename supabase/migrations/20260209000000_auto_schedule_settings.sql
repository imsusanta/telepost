-- Auto-schedule settings table for the Scheduler page
-- Allows users to configure automated quiz posting at specific times

CREATE TABLE IF NOT EXISTS auto_schedule_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  source_type TEXT NOT NULL DEFAULT 'question_bank' CHECK (source_type IN ('question_bank', 'ai_generated')),
  questions_per_post INTEGER DEFAULT 5 CHECK (questions_per_post BETWEEN 1 AND 20),
  topics TEXT[] DEFAULT '{}',
  schedule_times TIME[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

-- Enable RLS
ALTER TABLE auto_schedule_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own auto-schedule settings"
  ON auto_schedule_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own auto-schedule settings"
  ON auto_schedule_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own auto-schedule settings"
  ON auto_schedule_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own auto-schedule settings"
  ON auto_schedule_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Index for efficient querying
CREATE INDEX idx_auto_schedule_user_enabled ON auto_schedule_settings(user_id, enabled);
CREATE INDEX idx_auto_schedule_channel ON auto_schedule_settings(channel_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_auto_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_schedule_updated_at
  BEFORE UPDATE ON auto_schedule_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_schedule_updated_at();
