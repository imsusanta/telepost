# Invitation Code System Guide

## Overview

Your Quiz Genie application now has a comprehensive invitation code system that requires users to have a valid invitation code to sign up. This guide explains how to create and manage invitation codes, including custom codes like "telbot".

## Quick Start: Creating the "TELBOT" Invitation Code

### Option 1: Using SQL (Easiest - Recommended)

1. Go to your Supabase Dashboard SQL Editor:
   https://supabase.com/dashboard/project/wpkxbrdgktmwnowvmwue/sql/new

2. Copy and paste the contents of `scripts/create-telbot-code.sql`

3. Click "Run" to execute the SQL

4. The "TELBOT" invitation code is now active and ready to use!

### Option 2: Using the Node.js Script

```bash
# Set your Supabase service role key (get it from Supabase Dashboard > Settings > API)
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"

# Create the telbot code (1 use, never expires)
node scripts/create-invitation-code.js telbot

# Or create with custom settings:
node scripts/create-invitation-code.js telbot 100 90  # 100 uses, expires in 90 days
```

### Option 3: Using the Admin Dashboard

1. Log in as an admin user
2. Navigate to: `/dashboard/super-admin/invitations`
3. Unfortunately, the current UI only supports random code generation
4. **To add custom code support to the UI, see the "Enhancing the Admin UI" section below**

## How the System Works

### User Signup Flow

1. User visits `/auth` and clicks "Sign Up" tab
2. User must enter:
   - **Invitation Code** (e.g., "TELBOT")
   - Full Name
   - Email
   - Password
3. System validates the invitation code:
   - ✅ Code exists
   - ✅ Code is active
   - ✅ Code hasn't expired
   - ✅ Code hasn't reached max uses
4. If valid, user account is created with the free plan
5. The invitation code usage is tracked in the database

### Database Schema

**invitation_codes table:**
```sql
- id (UUID) - Unique identifier
- code (TEXT) - The invitation code (stored in UPPERCASE)
- created_by (UUID) - Admin who created it
- used_by (UUID) - Last user who used it
- max_uses (INTEGER) - Maximum number of uses (default: 1)
- current_uses (INTEGER) - How many times it's been used
- expires_at (TIMESTAMP) - When it expires (NULL = never)
- is_active (BOOLEAN) - Whether the code is active
- metadata (JSONB) - Additional data (batch info, purpose, etc.)
- created_at (TIMESTAMP) - When it was created
- used_at (TIMESTAMP) - When it was last used
```

## Managing Invitation Codes

### Creating Random Codes (via Admin Dashboard)

1. Go to `/dashboard/super-admin/invitations`
2. Enter number of codes to generate (1-100)
3. Set max uses per code
4. Set expiration days
5. Click "Generate Codes"

### Creating Custom Codes (via SQL or Script)

**Using the SQL script (recommended):**
```sql
-- Edit scripts/create-telbot-code.sql and change:
- The code: 'TELBOT' → 'YOUR_CODE'
- Max uses: 1 → your desired number
- Expires: NULL → NOW() + INTERVAL '90 days' (if you want expiration)
```

**Using the Node.js script:**
```bash
node scripts/create-invitation-code.js <code> [maxUses] [expiresInDays]

# Examples:
node scripts/create-invitation-code.js premium 50 30    # 50 uses, expires in 30 days
node scripts/create-invitation-code.js beta              # 1 use, never expires
node scripts/create-invitation-code.js trial 10 7       # 10 uses, expires in 7 days
```

### Viewing All Codes

**Admin Dashboard:**
- Navigate to `/dashboard/super-admin/invitations`
- View all codes with their status, uses, and expiration

**SQL Query:**
```sql
SELECT
  code,
  max_uses,
  current_uses,
  expires_at,
  is_active,
  created_at
FROM public.invitation_codes
ORDER BY created_at DESC;
```

### Deactivating a Code

**Admin Dashboard:**
- Go to `/dashboard/super-admin/invitations`
- Click the "Deactivate" button next to the code

**SQL:**
```sql
UPDATE public.invitation_codes
SET is_active = false
WHERE code = 'TELBOT';
```

### Reactivating a Code

**Admin Dashboard:**
- Go to `/dashboard/super-admin/invitations`
- Click the "Reactivate" button next to the deactivated code

**SQL:**
```sql
UPDATE public.invitation_codes
SET is_active = true
WHERE code = 'TELBOT';
```

### Deleting a Code

**Admin Dashboard:**
- Go to `/dashboard/super-admin/invitations`
- Click the "Delete" button next to the code

**SQL:**
```sql
DELETE FROM public.invitation_codes
WHERE code = 'TELBOT';
```

## Security Features

- ✅ **Code validation** - All codes are validated before use
- ✅ **Expiration support** - Codes can have expiration dates
- ✅ **Usage limits** - Control how many times a code can be used
- ✅ **Admin-only creation** - Only admins can create codes
- ✅ **Audit trail** - Track who created and used each code
- ✅ **Case-insensitive** - "telbot", "TELBOT", "TelBot" all work
- ✅ **Auto-deactivation** - Codes deactivate when max uses reached

## API Functions Available

### Frontend Service (`invitationService.ts`)

```typescript
// Validate a code (used during signup)
await validateInvitationCode(code: string)

// Create a custom code (admin only)
await createCustomInvitationCode(
  customCode: string,
  maxUses: number = 1,
  expiresInDays: number | null = null,
  metadata: any = {}
)

// Get all codes (admin only)
await getAllInvitationCodes()

// Deactivate/reactivate/delete codes
await deactivateInvitationCode(codeId: string)
await reactivateInvitationCode(codeId: string)
await deleteInvitationCode(codeId: string)
```

### Database Functions (RPC)

```sql
-- Validate a code
SELECT * FROM validate_invitation_code('TELBOT');

-- Consume a code (used during signup)
SELECT * FROM consume_invitation_code('TELBOT', user_id);

-- Create a custom code (admin only)
SELECT * FROM create_custom_invitation_code(
  'TELBOT',           -- code
  admin_user_id,      -- created_by
  1,                  -- max_uses
  NULL,               -- expires_in_days
  '{}'::jsonb         -- metadata
);
```

## Enhancing the Admin UI (Optional)

To add custom invitation code creation to the admin dashboard:

1. Edit `/src/pages/SuperAdminInvitations.tsx`
2. Add a new form section for custom codes
3. Use the `createCustomInvitationCode()` function from `invitationService.ts`

Example implementation:
```typescript
import { createCustomInvitationCode } from '@/services/invitationService';

const handleCreateCustomCode = async () => {
  try {
    const result = await createCustomInvitationCode(
      customCodeInput,
      maxUses,
      expiresInDays,
      { type: 'custom', purpose: 'telegram_bot' }
    );
    toast.success(`Custom code "${result.code}" created!`);
  } catch (error) {
    toast.error(error.message);
  }
};
```

## Testing the Invitation Code

1. **Log out** (if logged in)
2. Go to `/auth`
3. Click the "Sign Up" tab
4. Enter the invitation code: **TELBOT**
5. Fill in the rest of the signup form
6. Click "Sign Up"
7. You should be successfully registered!

## Troubleshooting

### "Invalid invitation code" error
- Check if the code exists in the database
- Verify the code is active (`is_active = true`)
- Check if it has expired
- Confirm it hasn't reached max uses

### "Only administrators can create invitation codes" error
- Ensure you're logged in as an admin or super_admin
- Check your user's role in the `profiles` table

### Code already exists
- Choose a different code
- Or update the existing code's settings

## Migration Information

The invitation code system consists of two migrations:

1. **20251122000000_invitation_system_and_free_plan.sql**
   - Creates the `invitation_codes` table
   - Adds validation and consumption functions
   - Sets up RLS policies
   - Seeds initial test codes

2. **20251123000000_add_custom_invitation_code.sql**
   - Adds `create_custom_invitation_code()` function
   - Enables custom code creation with validation
   - Checks for duplicate codes

Both migrations should be applied to your Supabase database.

## Example Invitation Codes

Here are some examples of invitation codes you might create:

| Code | Max Uses | Expires | Purpose |
|------|----------|---------|---------|
| TELBOT | 1 | Never | Single telegram bot user |
| WELCOME2024 | 100 | 90 days | General promotional code |
| BETA | 50 | 60 days | Beta tester access |
| PREMIUM | 10 | 30 days | Premium trial users |
| TRIAL | Unlimited | 7 days | Short-term trial campaign |

## Next Steps

1. ✅ Create the "TELBOT" invitation code using one of the methods above
2. ✅ Test the signup flow with the new code
3. 📝 (Optional) Enhance the admin UI to support custom code creation
4. 📝 (Optional) Create additional codes for different use cases
5. 📝 Monitor code usage in the admin dashboard

---

**Need help?** Check the `/dashboard/super-admin/invitations` page for code management, or run SQL queries in your Supabase Dashboard.
