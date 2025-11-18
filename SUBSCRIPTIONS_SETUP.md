# Add Public Subscriptions Table - Quick Setup Guide

## Problem
The `public.subscriptions` table needs to be added to your Supabase database.

## Quick Solution (2 minutes)

### Step 1: Open Supabase SQL Editor
Click this link: [Supabase SQL Editor](https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/sql/new)

Or navigate to:
- Supabase Dashboard → Your Project → SQL Editor → New Query

### Step 2: Copy the SQL File
Open this file in your code editor:
```
supabase/add_subscriptions_table.sql
```

### Step 3: Run the SQL
1. Copy the **entire contents** of `add_subscriptions_table.sql`
2. Paste into the Supabase SQL Editor
3. Click the **"Run"** button (or press Ctrl+Enter / Cmd+Enter)

### Step 4: Verify Success
You should see: ✅ **"Success. No rows returned"**

Check that these tables now exist in your database:
- `subscription_plans` - Available subscription tiers
- `subscriptions` - User subscription records
- `usage_tracking` - User quota tracking

## What Gets Created

### Tables:
1. **`subscription_plans`** - Defines 4 subscription tiers:
   - Starter ($29/month)
   - Pro ($99/month)
   - Agency ($249/month)
   - Enterprise ($999/month)

2. **`subscriptions`** - Tracks user subscriptions with:
   - User ID
   - Plan ID
   - Status (active/canceled/expired)
   - Billing period dates
   - Stripe integration fields

3. **`usage_tracking`** - Monitors quotas:
   - Quizzes generated
   - PDFs uploaded
   - Storage used

### Security:
- ✅ Row Level Security (RLS) enabled
- ✅ Users can only see their own data
- ✅ Anyone can view available plans
- ✅ Proper foreign key constraints

### Features:
- ✅ Auto-updating timestamps
- ✅ Pre-seeded subscription plans
- ✅ Helper function `get_user_plan(user_id)`
- ✅ Safe to run multiple times (uses IF NOT EXISTS)

## Alternative: Use Supabase CLI

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref cazrdevenbxdjussycfj

# Push migrations
supabase db push
```

This will apply all migration files in `supabase/migrations/` including:
- `20251118230000_ensure_subscriptions_table.sql` (new migration)

## Verify It Worked

### Option 1: Check in Supabase Dashboard
1. Go to: [Table Editor](https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/editor)
2. Look for these tables in the sidebar:
   - ✓ subscriptions
   - ✓ subscription_plans
   - ✓ usage_tracking

### Option 2: Test in Your App
1. Restart your development server
2. Navigate to the Billing page
3. You should see the 4 subscription plans displayed
4. No more errors about missing tables!

## Troubleshooting

### Error: "permission denied"
- Make sure you're logged into Supabase as the project owner
- Try using the Supabase SQL Editor (it has elevated permissions)

### Error: "relation already exists"
- This is fine! It means the table already exists
- The SQL uses `CREATE TABLE IF NOT EXISTS` so it's safe to re-run

### Error: "syntax error"
- Make sure you copied the **entire** SQL file
- Don't modify the SQL unless you know what you're doing
- Try copying again from the original file

## Files Reference

- **Quick Setup SQL**: `supabase/add_subscriptions_table.sql` ⭐ (Use this!)
- **Migration File**: `supabase/migrations/20251118230000_ensure_subscriptions_table.sql`
- **All Migrations**: `supabase/consolidated_migrations.sql`
- **Full Documentation**: `DATABASE_SETUP.md`

## Next Steps

After adding the subscriptions table:

1. ✅ Restart your application
2. ✅ Visit the Billing page to see subscription plans
3. ✅ Test creating a subscription (if applicable)
4. ✅ Verify usage tracking works

---

**Need Help?**
- Check the full setup guide: `DATABASE_SETUP.md`
- Supabase Docs: https://supabase.com/docs
