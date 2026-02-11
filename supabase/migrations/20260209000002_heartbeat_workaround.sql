-- =============================================
-- HEARTBEAT WORKAROUND FOR BACKGROUND PROCESSING
-- =============================================
-- Use this if the 'net' extension is NOT available in your Supabase project.
-- This creates a pulse that triggers a Webhook every minute.

-- 1. Create a table to act as a Heartbeat (Pulse)
CREATE TABLE IF NOT EXISTS scheduler_heartbeat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pulse_time TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable pg_cron (if available)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Schedule the Pulse
-- This inserts a row every minute, which will trigger the Webhook we set in the dashboard.
SELECT cron.schedule(
  'auto-schedule-pulse',
  '* * * * *',
  $$INSERT INTO scheduler_heartbeat (pulse_time) VALUES (now())$$
);

-- 4. Ensure auto_schedule_settings table is up to date
ALTER TABLE auto_schedule_settings ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
