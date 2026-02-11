# Database Fix Guide - Billing Schema Error

## Problem

The billing page was failing with the error:
```
Failed to load billing information: column subscription_plans.price does not exist
```

## Root Cause

The `subscription_plans` table in the database had an outdated schema:
- **Old Schema**: Used `price_monthly` and `price_yearly` columns with `features` and `limits` as JSONB
- **Expected Schema**: Uses a single `price` column with individual feature and limit columns

This mismatch occurred because migrations used `CREATE TABLE IF NOT EXISTS`, which didn't update the existing table structure.

## Solution

### Option 1: Run the Fix Script (Automated)

1. Get your Supabase service role key:
   - Go to: https://supabase.com/dashboard/project/wpkxbrdgktmwnowvmwue/settings/api
   - Copy the **service_role** key (NOT the anon key)

2. Run the fix script:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_key_here npm run db:fix
   ```

### Option 2: Manual SQL Execution (Recommended)

1. Go to the Supabase SQL Editor:
   - URL: https://supabase.com/dashboard/project/wpkxbrdgktmwnowvmwue/sql/new

2. Open the migration file:
   - File: `supabase/migrations/20251119030000_fix_billing_schema.sql`

3. Copy the entire contents and paste into the SQL Editor

4. Click "Run" to execute the migration

### Option 3: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref wpkxbrdgktmwnowvmwue

# Apply migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id wpkxbrdgktmwnowvmwue > src/integrations/supabase/types.ts
```

## What the Migration Does

1. **Drops and Recreates** the following tables with correct schema:
   - `subscription_plans` - With `price` column and individual feature flags
   - `subscriptions` - User subscription records
   - `usage_tracking` - Usage statistics and quotas

2. **Seeds Default Plans**:
   - Free: $0/month - 10 quizzes, 1GB storage
   - Starter: $29/month - 50 quizzes, 10GB storage
   - Pro: $99/month - Unlimited quizzes, 50GB storage
   - Agency: $249/month - Unlimited quizzes, 200GB storage
   - Enterprise: $999/month - Unlimited everything

3. **Creates Helper Functions**:
   - `get_user_plan(user_id)` - Get user's subscription details
   - `increment_quiz_count(user_id)` - Track quiz generation

4. **Sets up Row Level Security (RLS)**:
   - Users can only view/edit their own data
   - Plans are publicly visible

## Verification

After running the migration, verify it worked:

```bash
# Check the database
npm run db:check
```

Or manually check in Supabase:
1. Go to Table Editor
2. Open `subscription_plans` table
3. Verify these columns exist:
   - `price` (DECIMAL)
   - `max_telegram_channels` (INTEGER)
   - `has_advanced_ai` (BOOLEAN)
   - etc.

## New Schema Structure

### subscription_plans

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,              -- 'free', 'starter', 'pro', etc.
  display_name TEXT,             -- 'Free', 'Starter', 'Pro', etc.
  price DECIMAL(10, 2),          -- Single price column
  billing_period TEXT,           -- 'monthly' or 'yearly'

  -- Limits
  max_telegram_channels INTEGER,
  max_pdf_storage_gb INTEGER,
  max_quizzes_per_month INTEGER, -- NULL = unlimited
  max_batch_quiz_generation INTEGER,
  max_question_bank_size INTEGER,

  -- Features (individual boolean columns)
  has_advanced_ai BOOLEAN,
  has_auto_scheduling BOOLEAN,
  has_auto_pdf_explanations BOOLEAN,
  has_analytics_dashboard BOOLEAN,
  has_leaderboards BOOLEAN,
  has_custom_branding BOOLEAN,
  has_multi_language BOOLEAN,
  has_priority_support BOOLEAN,
  has_api_access BOOLEAN,
  has_white_label BOOLEAN,

  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### subscriptions

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT,                    -- 'active', 'canceled', 'expired'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  stripe_subscription_id TEXT,    -- For future payment integration
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id)
);
```

### usage_tracking

```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),

  -- Monthly counters
  quizzes_generated_this_month INTEGER,
  pdfs_uploaded_this_month INTEGER,

  -- Totals
  total_quizzes_generated INTEGER,
  total_pdfs_uploaded INTEGER,
  total_storage_used_bytes BIGINT,

  current_period_start TIMESTAMPTZ,
  last_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id)
);
```

## Troubleshooting

### "permission denied" Error

You need the service_role key, not the anon key. Get it from:
https://supabase.com/dashboard/project/wpkxbrdgktmwnowvmwue/settings/api

### "table already exists" Warnings

These are normal. The migration uses `DROP TABLE IF EXISTS` to ensure clean recreation.

### TypeScript Types Out of Sync

After running the migration, regenerate types:

```bash
# Using Supabase CLI
supabase gen types typescript --project-id wpkxbrdgktmwnowvmwue > src/integrations/supabase/types.ts

# Or manually update in Supabase Dashboard:
# Settings → API → TypeScript types → Copy
```

### Still Getting "column does not exist" Error

1. Clear your browser cache
2. Restart your dev server: `npm run dev`
3. Check if migration was applied: Look for the `price` column in subscription_plans table

## Next Steps

After fixing the database:

1. **Regenerate TypeScript types** (see above)
2. **Test the billing page** - Should load without errors
3. **Verify subscription plans** - Check that 5 plans are visible
4. **Test user subscription flow** - Try subscribing to a plan

## Related Files

- Migration: `supabase/migrations/20251119030000_fix_billing_schema.sql`
- Fix Script: `scripts/fix-billing-schema.js`
- Service Layer: `src/services/subscriptionService.ts`
- Types: `src/integrations/supabase/types.ts`

## Support

If you continue to have issues:
1. Check the Supabase logs in the Dashboard
2. Verify the migration was applied successfully
3. Ensure all environment variables are set correctly
4. Try the manual SQL execution method (most reliable)
