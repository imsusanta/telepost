# Process Scheduled Posts Edge Function

This edge function processes scheduled Telegram quiz posts and sends them at their scheduled time.

## Overview

The poll scheduling system works as follows:

1. **User schedules polls** via the frontend interface
2. **Database stores** scheduled posts in `scheduled_telegram_posts` table with status='pending'
3. **Cron job runs every minute** (`process_scheduled_telegram_posts()` function)
4. **Cron calls this edge function** via HTTP POST using pg_net
5. **Edge function processes** pending posts and sends them to Telegram
6. **Status updates** to 'sent' or 'failed' with error messages

## Architecture

```
┌─────────────────┐
│   PostgreSQL    │
│   Cron Job      │  Runs every minute
│   (pg_cron)     │
└────────┬────────┘
         │ HTTP POST via pg_net
         │
         ▼
┌─────────────────────────────┐
│  Edge Function              │
│  process-scheduled-posts    │
│                             │
│  1. Fetch pending posts     │
│  2. Mark as 'processing'    │
│  3. Send to Telegram        │
│  4. Update status           │
└─────────────┬───────────────┘
              │
              ▼
      ┌───────────────┐
      │   Telegram    │
      │   Bot API     │
      └───────────────┘
```

## Setup Instructions

### 1. Run Migrations

The following migrations must be applied:
- `20251118000001_scheduler_cron_job.sql` - Creates cron job and functions
- `20251126000001_configure_scheduler_settings.sql` - Creates config table

### 2. Configure Credentials

Run the setup script to configure your Supabase credentials:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/setup-scheduler-config.sql

SELECT set_system_config(
  'supabase_url',
  'https://your-project-id.supabase.co',
  'Supabase project URL'
);

SELECT set_system_config(
  'supabase_service_role_key',
  'your-service-role-key-here',
  'Service role key for edge function auth'
);
```

**Where to find these values:**
- **Project URL**: Supabase Dashboard → Settings → API → Project URL
- **Service Role Key**: Supabase Dashboard → Settings → API → Service Role Key

⚠️ **IMPORTANT**: Keep the service role key secret! Never commit it to version control.

### 3. Enable Required Extensions

The migrations automatically enable these PostgreSQL extensions:
- `pg_cron` - For scheduling jobs
- `pg_net` - For making HTTP requests from the database

If you see errors about these extensions, enable them manually in Supabase Dashboard:
Database → Extensions → Enable `pg_cron` and `pg_net`

### 4. Set Environment Variables

Ensure the edge function has access to these environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`

These are automatically available in Supabase Edge Functions.

## Testing

### Manual Trigger (SQL)

Test the scheduler manually:

```sql
-- Trigger the scheduler function
SELECT process_scheduled_telegram_posts();

-- Check for ready posts
SELECT * FROM scheduled_posts_status WHERE current_status = 'READY_TO_SEND';

-- View recent processing results
SELECT * FROM public.scheduled_telegram_posts
WHERE updated_at > now() - INTERVAL '5 minutes'
ORDER BY updated_at DESC;
```

### Direct Edge Function Call (HTTP)

Test the edge function directly:

```bash
curl -X POST "https://your-project-id.supabase.co/functions/v1/process-scheduled-posts" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"triggered_by": "manual", "triggered_at": "2025-11-26T00:00:00Z"}'
```

### End-to-End Test

1. Schedule a poll for 2 minutes in the future
2. Wait for the scheduled time
3. Check the Telegram channel for the poll
4. Verify status changed to 'sent' in database

```sql
-- Check post status
SELECT id, scheduled_time, status, sent_at, error_message
FROM public.scheduled_telegram_posts
WHERE id = 'YOUR_POST_ID';
```

## Monitoring

### View Cron Job Status

```sql
-- Check if cron job is active
SELECT jobid, jobname, schedule, command, active, last_run, next_run
FROM cron.job
WHERE jobname = 'process-scheduled-telegram-posts';

-- View cron job history
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-scheduled-telegram-posts')
ORDER BY start_time DESC
LIMIT 10;
```

### View Scheduled Posts

```sql
-- See all scheduled posts with their status
SELECT * FROM scheduled_posts_status
ORDER BY scheduled_time ASC;

-- Count posts by status
SELECT status, COUNT(*) as count
FROM public.scheduled_telegram_posts
GROUP BY status;
```

### View pg_net Requests

```sql
-- Check recent HTTP requests made by pg_net
SELECT id, created, status_code, error_msg
FROM net.http_request_queue
ORDER BY created DESC
LIMIT 10;
```

## Troubleshooting

### Issue: Posts stuck in 'processing' status

**Cause**: Edge function failed to send but didn't update status back to 'failed'

**Solution**:
```sql
-- Manually reset stuck posts (older than 10 minutes)
UPDATE public.scheduled_telegram_posts
SET status = 'pending'
WHERE status = 'processing'
  AND scheduled_time < now() - INTERVAL '10 minutes';
```

### Issue: Cron job not running

**Cause**: pg_cron extension not enabled or configuration missing

**Solution**:
1. Check extension: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. Enable if missing: `CREATE EXTENSION pg_cron;`
3. Check job: `SELECT * FROM cron.job WHERE jobname = 'process-scheduled-telegram-posts';`

### Issue: Edge function not being called

**Cause**: Missing or incorrect configuration

**Solution**:
```sql
-- Verify configuration
SELECT * FROM public.system_config
WHERE key IN ('supabase_url', 'supabase_service_role_key');

-- Update if needed
SELECT set_system_config('supabase_url', 'https://your-project.supabase.co', 'Project URL');
```

### Issue: "TELEGRAM_BOT_TOKEN is not configured"

**Cause**: Missing environment variable in edge function

**Solution**: Set the `TELEGRAM_BOT_TOKEN` environment variable in Supabase Dashboard:
Settings → Edge Functions → Environment Variables

## How the Fix Works

### Previous Issue (Before Fix)

The scheduler was broken because:
1. **Database cron function** changed status from 'pending' → 'processing'
2. **But never called the edge function**
3. **Edge function looked for** posts with status='pending'
4. **Result**: Posts stuck in 'processing', never sent

### Current Solution (After Fix)

Now the system works correctly:
1. **Database cron runs every minute**
2. **Calls edge function via pg_net** (HTTP POST)
3. **Edge function fetches pending posts**
4. **Marks them as 'processing'** immediately (prevents duplicates)
5. **Sends to Telegram** and updates status to 'sent' or 'failed'
6. **All errors are captured** and logged

## Performance

- **Batch size**: 50 posts per run (configurable via `.limit(50)`)
- **Frequency**: Every minute
- **Timeout protection**: Edge functions have 60s timeout by default
- **Race condition prevention**: Posts marked as 'processing' before sending
- **Retry mechanism**: Failed posts can be retried via frontend or SQL

## Security

- ✅ Service role key stored securely in `system_config` table with RLS
- ✅ Only service role can access `system_config`
- ✅ Edge function requires Bearer token authentication
- ✅ User isolation via `user_id` in scheduled posts (RLS enabled)

## Related Files

- **Edge Function**: `supabase/functions/process-scheduled-posts/index.ts`
- **Cron Migration**: `supabase/migrations/20251118000001_scheduler_cron_job.sql`
- **Config Migration**: `supabase/migrations/20251126000001_configure_scheduler_settings.sql`
- **Setup Script**: `supabase/setup-scheduler-config.sql`
- **Send Function**: `supabase/functions/send-telegram-quiz/index.ts`

## Support

If you encounter issues:
1. Check the edge function logs in Supabase Dashboard
2. Review cron job history: `SELECT * FROM cron.job_run_details`
3. Check pg_net request queue: `SELECT * FROM net.http_request_queue`
4. Verify configuration: `SELECT * FROM public.system_config`
