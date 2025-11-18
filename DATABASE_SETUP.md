# Database Setup Guide - Fix "subscriptions table not found" Error

## Problem

You're seeing this error: `Could not find the table 'public.subscriptions' in the schema cache`

This means the database migrations haven't been applied to your Supabase instance yet.

## Solution

You have **3 options** to fix this. Choose the one that works best for you:

---

## Option 1: Manual SQL Execution (Recommended - Fastest)

This is the quickest and most reliable method.

### Steps:

1. **Go to Supabase SQL Editor:**
   - Visit: https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/sql/new
   - Or navigate to: Dashboard → SQL Editor → New Query

2. **Open the migration file:**
   - File location: `supabase/consolidated_migrations.sql`
   - This file contains all necessary database schema

3. **Copy and Execute:**
   - Copy the entire contents of `supabase/consolidated_migrations.sql`
   - Paste into the SQL Editor
   - Click the "Run" button

4. **Verify Success:**
   - You should see "Success. No rows returned" or similar
   - Check Tables list to confirm `subscriptions` table exists

---

## Option 2: Use the Setup Script

### Requirements:
- Node.js installed
- Supabase Service Role Key

### Steps:

1. **Get your Service Role Key:**
   - Go to: https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/settings/api
   - Copy the **service_role** key (NOT the anon/public key)
   - ⚠️  **Keep this key secret!** It has full database access

2. **Run the setup script:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here node scripts/setup-database.js
   ```

3. **Follow the on-screen instructions:**
   - The script will check which tables are missing
   - It will guide you through the setup process

---

## Option 3: Use Supabase CLI

### Steps:

1. **Install Supabase CLI:**
   ```bash
   # Using Homebrew (macOS/Linux)
   brew install supabase/tap/supabase

   # Using Scoop (Windows)
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase

   # Or see: https://supabase.com/docs/guides/cli/getting-started
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```
   - This will open your browser for authentication

3. **Link your project:**
   ```bash
   supabase link --project-ref cazrdevenbxdjussycfj
   ```
   - You'll be prompted for your database password

4. **Push migrations:**
   ```bash
   supabase db push
   ```
   - This will apply all migration files from `supabase/migrations/`

5. **Verify:**
   ```bash
   supabase db diff
   ```
   - Should show "No schema differences detected"

---

## What Gets Created

The migrations will create the following tables:

### Core Tables:
- **subscription_plans** - Defines available subscription tiers (Starter, Pro, Agency, Enterprise)
- **subscriptions** - User subscription records
- **usage_tracking** - Tracks user quotas and usage

### Premium Feature Tables:
- **documents** - PDF storage for quiz generation
- **question_banks** - Large question repositories
- **quiz_analytics** - Engagement and performance tracking
- **leaderboards** - Gamification and competition
- **support_tickets** - Priority customer support

### Additional Setup:
- Row Level Security (RLS) policies for data isolation
- Database triggers for auto-updates
- Functions for subscription management
- Super admin roles and permissions
- Scheduled jobs for subscription renewal

---

## Verification

After running the migrations, verify they worked:

### Method 1: Check in Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/editor
2. Look for these tables in the left sidebar:
   - subscriptions
   - subscription_plans
   - usage_tracking
   - documents

### Method 2: Use the setup script
```bash
SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/setup-database.js
```
It will show ✓ for existing tables.

### Method 3: Test in your application
1. Restart your application
2. The error should be gone
3. Check admin dashboard for subscription features

---

## Troubleshooting

### Error: "permission denied for schema public"
- You need to use the **service_role** key, not the anon key
- Make sure you're an owner/admin of the Supabase project

### Error: "relation already exists"
- Some tables already exist - this is fine
- The migrations use `CREATE TABLE IF NOT EXISTS`
- You can safely re-run the migrations

### Error: "syntax error at or near..."
- Copy the SQL file contents exactly as-is
- Make sure you copied the entire file
- Don't modify the SQL unless you know what you're doing

### Still having issues?
- Check the Supabase Dashboard logs: https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/logs/postgres-logs
- Verify your database is healthy: https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/settings/database
- Contact support if needed

---

## Migration Files

All migration files are located in: `supabase/migrations/`

Key files:
- `20251118000000_premium_features_schema.sql` - Main schema with subscriptions
- `20251118140000_add_super_admin_roles.sql` - Admin permissions
- `20251118180000_setup_super_admin_and_pro_plan.sql` - Initial data
- `consolidated_migrations.sql` - All migrations combined (use this for manual execution)

---

## Next Steps

After successfully applying the migrations:

1. ✅ Restart your application
2. ✅ Test subscription features
3. ✅ Verify admin dashboard works
4. ✅ Check that users can view subscription plans
5. ✅ Test document upload (if using PDF features)

---

## Questions?

- Supabase Docs: https://supabase.com/docs
- Supabase CLI Docs: https://supabase.com/docs/guides/cli
- SQL Editor Guide: https://supabase.com/docs/guides/database/overview
