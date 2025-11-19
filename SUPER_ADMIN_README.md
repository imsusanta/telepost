# Super Admin & Billing System

This document describes the Super Admin features, Billing system, and Coupon management implemented in Quiz Genie.

## Features Implemented

### 1. Super Admin Role System

- **Role-based Access Control**: Three user roles: `user`, `admin`, and `super_admin`
- **Database Level Security**: Row Level Security (RLS) policies protect sensitive data
- **Super Admin Functions**: Helper functions to check user roles (`is_super_admin()`, `is_admin()`)

### 2. Coupon Management System

Super admins can create and manage discount coupons with the following features:

#### Coupon Properties
- **Code**: Unique coupon code (e.g., SUMMER2024, QUIZ50)
- **Discount Type**:
  - Percentage discount (e.g., 20% off)
  - Fixed amount discount (e.g., $10 off)
- **Usage Limits**:
  - Maximum total uses (optional)
  - Maximum uses per user (default: 1)
- **Validity Period**:
  - Valid from date
  - Valid until date (optional)
- **Plan Restrictions**: Apply to specific plans or all plans
- **Minimum Purchase**: Optional minimum purchase amount
- **Status**: Active/Inactive toggle

#### Coupon Validation
- Real-time validation during checkout
- Checks for:
  - Coupon existence and active status
  - Validity period
  - Usage limits (total and per-user)
  - Plan applicability
  - Minimum purchase requirements
- Returns discount amount and final price

### 3. Billing System with Coupon Support

- **Subscription Plans**: Free, Starter, Pro, Agency, Enterprise
- **Coupon Application**: Users can apply coupon codes during subscription purchase
- **Price Calculation**: Automatic discount calculation and display
- **Discount Tracking**: Records coupon usage in database

### 4. User Management (Super Admin)

Super admins can:
- View all users with their subscription details
- Upgrade/downgrade user plans
- Suspend/activate user accounts
- Search users by email or name
- View user usage statistics

## Database Schema

### Tables Created

#### `coupons`
```sql
- id (UUID)
- code (TEXT, unique)
- description (TEXT)
- discount_type ('percentage' | 'fixed_amount')
- discount_value (DECIMAL)
- max_uses (INTEGER, nullable)
- current_uses (INTEGER)
- max_uses_per_user (INTEGER)
- valid_from (TIMESTAMPTZ)
- valid_until (TIMESTAMPTZ, nullable)
- applicable_plans (TEXT[])
- min_purchase_amount (DECIMAL, nullable)
- is_active (BOOLEAN)
- created_by (UUID)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### `coupon_usage`
```sql
- id (UUID)
- coupon_id (UUID)
- user_id (UUID)
- subscription_id (UUID)
- discount_amount (DECIMAL)
- original_amount (DECIMAL)
- final_amount (DECIMAL)
- used_at (TIMESTAMPTZ)
```

#### Updated `subscriptions`
```sql
Added columns:
- coupon_id (UUID, nullable)
- discount_amount (DECIMAL)
- original_price (DECIMAL)
```

## API Functions

### Coupon Service (`src/services/couponService.ts`)

- `getAllCoupons()`: Get all coupons (super admin only)
- `createCoupon(data)`: Create new coupon (super admin only)
- `updateCoupon(id, updates)`: Update coupon (super admin only)
- `deleteCoupon(id)`: Delete coupon (super admin only)
- `toggleCouponStatus(id, status)`: Activate/deactivate coupon
- `validateCoupon(code, planName, amount)`: Validate coupon code
- `applyCoupon(code, subscriptionId, ...)`: Apply coupon after purchase
- `getCouponUsageHistory(couponId?)`: Get usage history
- `generateCouponCode(prefix, length)`: Generate random coupon code
- `isSuperAdmin()`: Check if current user is super admin

### Super Admin Service (`src/services/superAdminService.ts`)

- `getAllUsers()`: Get all users with subscription details
- `updateUserSubscription(userId, planId)`: Update user's plan
- `updateUserRole(userId, role)`: Change user role
- `updateUserStatus(userId, status)`: Suspend/activate user
- `toggleUserPurchaseAbility(userId, canPurchase)`: Control purchase permissions
- `getSubscriptionStats()`: Get subscription statistics
- `getCouponStats()`: Get coupon statistics
- `cancelUserSubscription(userId)`: Cancel user subscription
- `searchUsers(query)`: Search users by email/name
- `getUserDetails(userId)`: Get detailed user information

### Updated Subscription Service

- `createSubscription(userId, planName, couponCode?)`: Create subscription with optional coupon

## UI Pages

### 1. Super Admin Coupon Management (`/dashboard/super-admin/coupons`)

Features:
- View all coupons with statistics
- Create new coupons with auto-generate code
- Toggle active/inactive status
- Delete coupons
- Copy coupon codes to clipboard
- Real-time usage tracking

### 2. Super Admin User Management (`/dashboard/super-admin/users`)

Features:
- View all users in a table
- Search users by email or name
- User statistics dashboard
- Edit user subscriptions
- Suspend/activate users
- View user usage metrics

### 3. Updated Billing Page (`/dashboard/billing`)

Features:
- Enter coupon codes
- Apply coupons to specific plans
- Real-time discount calculation
- Visual discount display
- Coupon removal option

## Setup Instructions

### 1. Run Database Migrations

```bash
# Apply migrations in order
cd supabase/migrations

# The following migrations will be applied:
# 1. 20251119040000_coupon_system.sql - Creates coupon tables and functions
# 2. 20251119050000_create_super_admin.sql - Assigns super admin role
```

### 2. Create Super Admin User

Edit `supabase/migrations/20251119050000_create_super_admin.sql` and update the email:

```sql
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'your-email@example.com'; -- Replace with your email
```

Or use the alternative to make the first registered user a super admin:

```sql
UPDATE public.profiles
SET role = 'super_admin'
WHERE id = (
  SELECT id FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1
);
```

### 3. Apply Migrations

Using Supabase CLI:
```bash
supabase db push
```

Or apply manually through Supabase Dashboard SQL Editor.

### 4. Verify Installation

1. Log in with your super admin account
2. Check that "Super Admin" section appears in the navigation
3. Access `/dashboard/super-admin/coupons` to create coupons
4. Access `/dashboard/super-admin/users` to manage users

## Usage Examples

### Creating a Coupon

1. Navigate to `/dashboard/super-admin/coupons`
2. Click "Create Coupon"
3. Fill in the form:
   - Code: SUMMER2024 (or click "Generate")
   - Description: Summer sale discount
   - Discount Type: Percentage
   - Discount Value: 20
   - Max Total Uses: 100 (optional)
   - Max Uses Per User: 1
   - Valid Until: 2024-09-30
4. Click "Create Coupon"

### Applying a Coupon

1. Navigate to `/dashboard/billing`
2. Enter coupon code in the "Have a Coupon Code?" section
3. Select a plan
4. Click "Apply Coupon" on the desired plan
5. Verify the discounted price
6. Click "Upgrade Now" to complete purchase

### Managing Users

1. Navigate to `/dashboard/super-admin/users`
2. Use search to find specific users
3. Click "Plan" button to change user subscription
4. Click "Suspend" or "Activate" to manage user status

## Security Considerations

- All super admin operations are protected by RLS policies
- Only users with `role = 'super_admin'` can access admin features
- Coupon validation happens server-side to prevent tampering
- Usage tracking prevents coupon abuse
- Database functions use `SECURITY DEFINER` for controlled access

## Database Functions

### `validate_coupon(code, user_id, plan_name, amount)`
Validates a coupon code and returns:
- `is_valid`: Boolean indicating validity
- `error_message`: Error description if invalid
- `discount_amount`: Calculated discount
- `final_amount`: Price after discount

### `apply_coupon(code, user_id, subscription_id, discount, original, final)`
Records coupon usage and increments usage counter.

### `is_super_admin(user_id)`
Returns true if user has super_admin role.

### `is_admin(user_id)`
Returns true if user has admin or super_admin role.

## File Structure

```
src/
├── services/
│   ├── couponService.ts           # Coupon management logic
│   ├── superAdminService.ts       # User management logic
│   └── subscriptionService.ts     # Updated with coupon support
├── pages/
│   ├── SuperAdminCoupons.tsx      # Coupon management UI
│   ├── SuperAdminUsers.tsx        # User management UI
│   └── Billing.tsx                # Updated with coupon input
├── components/
│   └── DashboardLayout.tsx        # Updated navigation
└── App.tsx                        # Added new routes

supabase/migrations/
├── 20251119040000_coupon_system.sql
└── 20251119050000_create_super_admin.sql
```

## Support

For issues or questions:
1. Check the database migration logs
2. Verify RLS policies are enabled
3. Ensure user has correct role assigned
4. Check browser console for errors

## Future Enhancements

Potential improvements:
- Email notifications for coupon usage
- Bulk coupon generation
- Coupon analytics dashboard
- Automated coupon expiry notifications
- User-specific coupon assignment
- Recurring discount support
- Integration with payment gateways (Stripe, Razorpay)
