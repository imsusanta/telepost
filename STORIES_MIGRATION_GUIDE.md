# Telegram Stories Feature - Migration Guide

## Overview

This guide will help you fix the Story Post Feature by applying the database migration that creates all necessary tables, indexes, RLS policies, and seed data for the Telegram Stories functionality.

## Current Issues

The following errors indicate that the database migration hasn't been applied yet:

- ❌ "Failed to post story"
- ❌ "Failed to create story"
- ❌ "Failed to load templates"
- ❌ "Could not find the table 'public.story_templates' in the schema cache"

## Solution

You need to apply the migration file: `supabase/migrations/20251119060000_telegram_stories_feature.sql`

This migration creates:
- ✅ 3 database tables (telegram_stories, story_templates, story_analytics)
- ✅ Custom ENUM types for media types and story status
- ✅ 13 performance indexes
- ✅ Row Level Security (RLS) policies for data protection
- ✅ 4 default story templates (Quiz, Results, Promotional, Announcement)
- ✅ Storage bucket configuration for story media files
- ✅ Automated cron jobs for scheduled posting and expiration
- ✅ Trigger functions for timestamp management

---

## Option 1: Apply via Supabase Dashboard (Recommended)

This is the easiest and most reliable method:

### Steps:

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/sql/new
   - Or navigate: Dashboard → SQL Editor → New Query

2. **Copy Migration SQL**
   - Open the file: `supabase/migrations/20251119060000_telegram_stories_feature.sql`
   - Copy ALL contents (365 lines)
   - **Important**: Make sure you copy the entire file, including:
     - ENUM type creation
     - Table creation
     - Index creation
     - RLS policies
     - Trigger functions
     - Cron jobs
     - Seed data (4 default templates)
     - Storage bucket setup

3. **Run Migration**
   - Paste the SQL into the SQL Editor
   - Click the "Run" button (or press Ctrl+Enter)
   - Wait for execution to complete

4. **Verify Success**
   You should see a success message indicating:
   - Tables created
   - Indexes created
   - Policies created
   - 4 rows inserted (templates)
   - Functions created
   - Cron jobs scheduled

5. **Check Results**
   Run the verification script:
   ```bash
   npm run db:stories-check
   ```

   Or verify manually in SQL Editor:
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('telegram_stories', 'story_templates', 'story_analytics');

   -- Check templates are seeded
   SELECT name, category FROM story_templates WHERE is_public = true;
   ```

---

## Option 2: Apply via Supabase CLI

If you have Supabase CLI installed:

### Steps:

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   # or
   brew install supabase/tap/supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link to Your Project**
   ```bash
   supabase link --project-ref cazrdevenbxdjussycfj
   ```

4. **Push Migration**
   ```bash
   supabase db push
   ```

   This will apply all pending migrations including the stories feature.

5. **Verify**
   ```bash
   npm run db:stories-check
   ```

---

## Option 3: Apply via Script (Requires Service Role Key)

If you have the Supabase service role key:

### Steps:

1. **Get Service Role Key**
   - Go to: https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/settings/api
   - Copy the "service_role" key (NOT the anon key)
   - **Important**: Keep this key secure! Never commit it to version control.

2. **Run Migration Script**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here npm run db:stories
   ```

3. **Verify**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here npm run db:stories-check
   ```

---

## What Gets Created

### Database Tables

#### 1. **telegram_stories** (Main story table)
- Stores all story posts with media, text, and scheduling
- Tracks status (draft, scheduled, posted, failed, expired, deleted)
- Includes analytics counters (views, interactions)
- Supports highlights (permanent stories)
- Links to channels and users

#### 2. **story_templates** (Pre-designed templates)
- 4 default templates included:
  - **Quiz Announcement** (Blue) - For announcing new quizzes
  - **Quiz Results** (Green) - For sharing quiz scores
  - **Promotional** (Purple) - For special offers
  - **Announcement** (Orange) - For general updates
- Supports custom user templates
- Tracks usage statistics

#### 3. **story_analytics** (Engagement tracking)
- Tracks viewer interactions:
  - Views
  - Shares
  - Reactions
  - Clicks
  - Forwards
- Stores viewer information when available
- Time-based event logging

### Storage Configuration

- **Bucket**: `story-media` (public)
- **File Types**: Images (10MB max), Videos (50MB max)
- **Path Structure**: `{userId}/{timestamp}_{random}.{extension}`
- **RLS Policies**: Users can only upload/manage their own files

### Automated Jobs

- **Scheduled Story Processing**: Runs every minute
  - Finds stories with `status='scheduled'` and `scheduled_time <= NOW()`
  - Posts them to Telegram
  - Updates status to 'posted'

- **Story Expiration**: Runs every 5 minutes
  - Marks expired stories (non-highlights past `expires_at`)
  - Updates status to 'expired'

---

## Verification Steps

After applying the migration, verify everything is working:

### 1. Check Database Tables

Run this in Supabase SQL Editor:
```sql
-- Check all tables exist
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('telegram_stories', 'story_templates', 'story_analytics');
```

Expected result: 3 tables with 25+, 13+, and 8+ columns respectively.

### 2. Check Default Templates

```sql
SELECT name, category, media_type, usage_count
FROM story_templates
WHERE is_public = true
ORDER BY name;
```

Expected result: 4 templates (Announcement, Promotional, Quiz Announcement, Quiz Results)

### 3. Check Indexes

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('telegram_stories', 'story_templates', 'story_analytics')
ORDER BY tablename, indexname;
```

Expected result: 13+ indexes

### 4. Check RLS Policies

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('telegram_stories', 'story_templates', 'story_analytics')
ORDER BY tablename, policyname;
```

Expected result: 10+ policies

### 5. Check Storage Bucket

```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'story-media';
```

Expected result: 1 row with `public = true`

### 6. Check Cron Jobs

```sql
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname IN ('process-scheduled-stories', 'expire-old-stories');
```

Expected result: 2 cron jobs

---

## Test the Story Feature

After migration is applied, test the complete flow:

### 1. Navigate to Stories Page
- Go to the application
- Click on "Stories" in the navigation menu

### 2. Test Template Loading
- Click on the "Templates" tab in the story editor
- You should see 4 default templates
- Try selecting a template

### 3. Test Story Creation (Draft)
- Select "Text" as media type
- Add some text in the text overlay editor
- Click "Save Draft"
- Verify the story appears in the "All Stories" tab with "Draft" status

### 4. Test Story Creation (Post Now)
- Create a new story
- Select a channel with valid bot token and chat ID
- Click "Post Now"
- Verify:
  - Story status changes to "Posted"
  - No error messages appear
  - Check your Telegram channel for the posted story

### 5. Test Scheduled Stories
- Create a new story
- Enable "Schedule for later"
- Set a time 1-2 minutes in the future
- Click "Schedule Story"
- Wait for the scheduled time
- Verify the story gets posted automatically

### 6. Test Story Deletion
- Select any story
- Click the "Delete" button
- Confirm deletion
- Verify the story is removed from the list

---

## Troubleshooting

### Issue: "Table already exists" errors during migration

**Solution**: Some objects might already exist. Options:
1. Drop existing objects first (be careful!):
   ```sql
   DROP TABLE IF EXISTS telegram_stories CASCADE;
   DROP TABLE IF EXISTS story_templates CASCADE;
   DROP TABLE IF EXISTS story_analytics CASCADE;
   DROP TYPE IF EXISTS media_type_enum CASCADE;
   DROP TYPE IF EXISTS story_status_enum CASCADE;
   ```
   Then run the migration again.

2. Or manually skip the CREATE TABLE statements and run only what's missing.

### Issue: "Permission denied" when creating cron jobs

**Solution**: Cron jobs require the `pg_cron` extension:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

If you don't have permission, you may need to:
- Contact Supabase support to enable pg_cron
- Or run the cron job processing manually/via external scheduler

### Issue: "Storage bucket already exists"

**Solution**: The migration handles this with `ON CONFLICT DO NOTHING`. If you still get errors:
```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'story-media';

-- If it doesn't exist, create it
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-media', 'story-media', true);
```

### Issue: Templates not showing up

**Solution**: Re-run just the template seed data:
```sql
INSERT INTO story_templates (name, description, category, media_type, background_color, default_text_overlay, is_public) VALUES
('Quiz Announcement', 'Template for announcing new quizzes', 'quiz', 'text', '#3B82F6', '[{"text":"New Quiz Available!","fontSize":48,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":30},"align":"center"},{"text":"Tap to participate","fontSize":24,"color":"#E0E7FF","position":{"x":50,"y":70},"align":"center"}]'::jsonb, TRUE),
('Quiz Results', 'Template for sharing quiz results', 'quiz', 'text', '#10B981', '[{"text":"Quiz Completed!","fontSize":42,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":25},"align":"center"},{"text":"{{score}}","fontSize":64,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":50},"align":"center"},{"text":"Great job!","fontSize":28,"color":"#D1FAE5","position":{"x":50,"y":75},"align":"center"}]'::jsonb, TRUE),
('Promotional', 'Template for promotional content', 'promotion', 'text', '#8B5CF6', '[{"text":"Special Offer","fontSize":36,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":35},"align":"center"},{"text":"Limited Time","fontSize":24,"color":"#EDE9FE","position":{"x":50,"y":65},"align":"center"}]'::jsonb, TRUE),
('Announcement', 'Template for general announcements', 'announcement', 'text', '#F59E0B', '[{"text":"Announcement","fontSize":40,"fontWeight":"bold","color":"#FFFFFF","position":{"x":50,"y":40},"align":"center"},{"text":"Stay tuned!","fontSize":26,"color":"#FEF3C7","position":{"x":50,"y":60},"align":"center"}]'::jsonb, TRUE)
ON CONFLICT DO NOTHING;
```

---

## Additional Notes

### RLS Security
- All tables have Row Level Security (RLS) enabled
- Users can only access their own stories
- Public templates are visible to all authenticated users
- Analytics can only be inserted by system (service role)

### Performance
- 13 indexes optimize common queries:
  - User story lookups
  - Channel filtering
  - Status filtering
  - Scheduled story processing
  - Expiration checking
  - Analytics queries

### Media Storage
- Images: Max 10MB, validated on upload
- Videos: Max 50MB, validated on upload
- Files are stored with user-isolated paths
- Automatic cleanup on story deletion

### Telegram Integration
- Stories are posted via Telegram Bot API
- Supports images, videos, and text-only stories
- Text overlays are converted to formatted captions
- Markdown formatting is preserved
- Error messages provide helpful troubleshooting info

---

## Success Criteria

After completing the migration, you should be able to:

✅ Navigate to Stories page without errors
✅ Load story templates (4 default templates visible)
✅ Create draft stories
✅ Upload media files (images/videos)
✅ Post stories immediately to Telegram
✅ Schedule stories for later posting
✅ View story analytics
✅ Mark stories as highlights
✅ Delete stories
✅ See stories in different tabs (All, Active, Scheduled, Highlights)

---

## Support

If you encounter issues:

1. Check the browser console for detailed error messages
2. Check Supabase logs in the dashboard
3. Verify your bot token and chat ID are correct
4. Ensure your bot has admin permissions in the target channel
5. Run the verification queries to check database state

For additional help, refer to:
- Supabase Documentation: https://supabase.com/docs
- Telegram Bot API: https://core.telegram.org/bots/api
- Project README and documentation

---

**Migration File**: `supabase/migrations/20251119060000_telegram_stories_feature.sql`
**Migration Script**: `scripts/apply-stories-migration.js`
**Verification Commands**: `npm run db:stories-check`

---

## Quick Reference Commands

```bash
# Check migration status
npm run db:stories-check

# Apply migration (with service role key)
SUPABASE_SERVICE_ROLE_KEY=your_key npm run db:stories

# Start development server
npm run dev

# Build for production
npm run build
```

---

**Important**: After applying the migration successfully, all Story Post Feature errors should be resolved and the feature should be fully functional!
