# Quick Fix: Billing Database Error

## Error
```
Failed to load billing information: column subscription_plans.price does not exist
```

## Quick Fix (2 minutes)

### Step 1: Go to Supabase SQL Editor
https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/sql/new

### Step 2: Copy & Paste This SQL

Open `supabase/migrations/20251119030000_fix_billing_schema.sql` and copy all contents.

### Step 3: Click "Run"

That's it! The billing page should now work.

## Verify It Worked

1. Refresh your billing page
2. You should see 5 subscription plans:
   - Free ($0)
   - Starter ($29)
   - Pro ($99)
   - Agency ($249)
   - Enterprise ($999)

## Alternative: Use Script

```bash
SUPABASE_SERVICE_ROLE_KEY=your_key npm run db:fix
```

Get your service key from:
https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/settings/api

---

**Need more help?** See [DATABASE_FIX_GUIDE.md](./DATABASE_FIX_GUIDE.md)

**Full database setup?** See [COMPLETE_DATABASE_SETUP.md](./COMPLETE_DATABASE_SETUP.md)
