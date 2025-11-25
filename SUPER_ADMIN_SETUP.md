# Super Admin Setup Guide

This guide explains how to set up and use the super admin functionality in TelePost.

## Overview

The super admin system provides elevated privileges for managing:
- All users and their subscriptions
- Coupon/discount codes
- Invitation codes
- System-wide settings

## Key Features

### 1. **Separate Login Portal**
- Super admin login page: `/super-admin/login`
- Regular user login page: `/auth`
- Distinct red/orange theme for super admin areas

### 2. **Role-Based Access Control**
- Uses `user_roles` table with `app_role` enum
- Checks super admin role before allowing access
- Automatic redirection for unauthorized access

### 3. **Protected Routes**
All super admin routes are protected with `SuperAdminRoute` component:
- `/dashboard/super-admin` - Main dashboard with statistics
- `/dashboard/super-admin/users` - User management
- `/dashboard/super-admin/coupons` - Coupon management
- `/dashboard/super-admin/invitations` - Invitation code management

## Setup Instructions

### Step 1: Create Your First Super Admin

You need to create at least one super admin user. There are three methods:

#### Method A: Using Email (Recommended)

1. Open the migration file: `supabase/migrations/20251125000000_create_super_admin_user.sql`
2. Replace `'your-super-admin@example.com'` with your actual email address
3. Run the migration:
   ```bash
   # If using Supabase CLI
   supabase db push

   # Or apply the migration directly in Supabase SQL Editor
   ```

#### Method B: Set First User as Super Admin

1. Open the migration file: `supabase/migrations/20251125000000_create_super_admin_user.sql`
2. Comment out the email-based UPDATE statements (lines 10-12)
3. Uncomment the "Alternative" section (lines 17-27) that sets the first user as super admin
4. Run the migration

#### Method C: Manual SQL Update (For Existing Users)

If you already have a user account and want to make it a super admin:

```sql
-- Replace 'your-email@example.com' with your email
INSERT INTO public.user_roles (user_id, role)
SELECT
  p.id,
  'super_admin'::app_role
FROM public.profiles p
WHERE p.email = 'your-email@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role = 'super_admin'::app_role
  );

-- Also update legacy role column
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'your-email@example.com';
```

### Step 2: Verify Super Admin Access

1. Navigate to `/super-admin/login`
2. Enter your super admin email and password
3. You should be redirected to `/dashboard/super-admin`
4. If not a super admin, you'll be redirected to regular dashboard with an error message

## Authentication Flow

### Regular User Flow
1. Visit `/auth`
2. Sign in with email/password + invitation code
3. Redirected to `/dashboard`
4. Access to regular features only

### Super Admin Flow
1. Visit `/super-admin/login`
2. Sign in with email/password (no invitation code needed)
3. System checks `user_roles` table for super_admin role
4. If valid: redirected to `/dashboard/super-admin`
5. If invalid: signed out and shown error message

## Security Features

### 1. Route Protection
- `SuperAdminRoute` component validates role on every page load
- Uses `isSuperAdmin()` function that calls database RPC
- Automatic redirection for unauthorized access

### 2. Database-Level Security
- Row-Level Security (RLS) policies on all tables
- Super admin checks use `SECURITY DEFINER` functions
- Role stored in dedicated `user_roles` table

### 3. Rate Limiting
- 5 login attempts per 15 minutes
- Separate rate limit for super admin login
- Account temporarily locked after exceeding attempts

## Troubleshooting

### Issue: "Access Denied" when logging in

**Cause**: User doesn't have super_admin role in database

**Solution**:
```sql
-- Check if user has super admin role
SELECT ur.*, p.email
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'super_admin'::app_role;

-- If no results, add super admin role
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM profiles
WHERE email = 'your-email@example.com';
```

### Issue: Regular user can access super admin pages

**Cause**: Old routes using `ProtectedRoute` instead of `SuperAdminRoute`

**Solution**:
- Check `src/App.tsx`
- All routes under `/dashboard/super-admin/` should use `<SuperAdminRoute>` component

### Issue: Migration fails with "email not found"

**Cause**: Placeholder email not replaced

**Solution**:
1. Edit migration file
2. Replace `'your-super-admin@example.com'` with real email
3. Or use one of the alternative methods (first user, specific ID)

## Managing Multiple Super Admins

To add additional super admins:

```sql
-- Add another super admin
INSERT INTO public.user_roles (user_id, role)
SELECT
  p.id,
  'super_admin'::app_role
FROM public.profiles p
WHERE p.email = 'another-admin@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also update legacy column
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'another-admin@example.com';
```

## Removing Super Admin Access

To revoke super admin privileges:

```sql
-- Remove super admin role
DELETE FROM public.user_roles
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'former-admin@example.com'
)
AND role = 'super_admin'::app_role;

-- Update legacy column
UPDATE public.profiles
SET role = 'user'
WHERE email = 'former-admin@example.com';
```

## Database Schema

### user_roles Table
```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,  -- 'super_admin', 'admin', 'user'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
```

### Role Check Functions
```sql
-- Check if user is super admin
SELECT public.is_super_admin(user_id);

-- Check if user is admin or super admin
SELECT public.is_admin(user_id);
```

## Files Modified

- `src/components/SuperAdminRoute.tsx` - Route protection component
- `src/pages/SuperAdminLogin.tsx` - Super admin login page
- `src/App.tsx` - Updated routes to use SuperAdminRoute
- `supabase/migrations/20251125000000_create_super_admin_user.sql` - Migration to create super admin

## Best Practices

1. **Use Strong Passwords**: Super admin accounts should have extra strong passwords
2. **Limit Super Admins**: Only create super admin accounts when absolutely necessary
3. **Regular Audits**: Periodically review who has super admin access
4. **Separate Accounts**: Don't use super admin account for regular tasks
5. **Audit Logging**: Monitor super admin actions (implement audit log if needed)

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify database migration ran successfully
3. Confirm user exists in `user_roles` table with super_admin role
4. Check Supabase logs for authentication errors
