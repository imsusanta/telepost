import { supabase } from '@/integrations/supabase/client';
import type { SubscriptionPlan as _SubscriptionPlan } from './subscriptionService';
void ({} as _SubscriptionPlan);

export type AppRole = 'user' | 'super_admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  can_purchase_plans: boolean;
  status: 'active' | 'suspended' | 'banned';
  account_locked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithSubscription extends UserProfile {
  subscription?: {
    id: string;
    plan_id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    plan: {
      name: string;
      display_name: string;
      price: number;
      max_telegram_channels: number;
      quiz_manual_only: boolean;
      has_ai_writing: boolean;
      question_bank_private_only: boolean;
    };
  } | null;
  usage?: {
    quizzes_generated_this_month: number;
    pdfs_uploaded_this_month: number;
    total_storage_used_bytes: number;
  } | null;
}

export interface PaginatedUsersResponse {
  users: UserWithSubscription[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get paginated users with their subscription details (super admin only)
 */
export async function getPaginatedUsers(
  page: number = 1,
  pageSize: number = 20,
  searchQuery?: string,
  roleFilter?: AppRole,
  statusFilter?: 'active' | 'suspended' | 'banned'
): Promise<PaginatedUsersResponse> {
  const offset = (page - 1) * pageSize;

  // Build base query for profiles
  let profilesQuery = supabase
    .from('profiles')
    .select('*', { count: 'exact' });

  // Add search filter if provided
  if (searchQuery && searchQuery.trim()) {
    profilesQuery = profilesQuery.or(
      `email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`
    );
  }

  // Add status filter if provided
  if (statusFilter) {
    profilesQuery = profilesQuery.eq('status', statusFilter);
  }

  // Get paginated profiles
  const { data: profiles, error: profilesError, count } = await profilesQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    throw new Error(profilesError.message);
  }

  if (!profiles || profiles.length === 0) {
    return {
      users: [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  }

  // Get user IDs for this page
  const userIds = profiles.map(p => p.id);

  // Fetch subscriptions, usage, and user roles for these users in parallel
  const [subscriptionsResult, usageResult, rolesResult] = await Promise.all([
    supabase
      .from('subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        subscription_plans (
          name,
          display_name,
          price,
          max_telegram_channels,
          quiz_manual_only,
          has_ai_writing,
          question_bank_private_only
        )
      `)
      .in('user_id', userIds)
      .eq('status', 'active'),
    supabase
      .from('usage_tracking')
      .select('user_id, quizzes_generated_this_month, pdfs_uploaded_this_month, total_storage_used_bytes')
      .in('user_id', userIds),
    supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds)
  ]);

  if (subscriptionsResult.error) {
    console.error('Error fetching subscriptions:', subscriptionsResult.error);
  }

  if (usageResult.error) {
    console.error('Error fetching usage:', usageResult.error);
  }

  if (rolesResult.error) {
    console.error('Error fetching roles:', rolesResult.error);
  }

  // Create lookup maps for O(1) access
  const subscriptionMap = new Map(
    (subscriptionsResult.data || []).map(s => [s.user_id, s])
  );
  const usageMap = new Map(
    (usageResult.data || []).map(u => [u.user_id, u])
  );
  const roleMap = new Map(
    (rolesResult.data || []).map(r => [r.user_id, r.role as AppRole])
  );

  // Combine the data
  let users: UserWithSubscription[] = profiles.map(profile => {
    const userSub = subscriptionMap.get(profile.id);
    const userUsage = usageMap.get(profile.id);
    const userRole = roleMap.get(profile.id) || 'user';

    return {
      id: profile.id,
      email: profile.email || 'no-email@unknown.local',
      full_name: profile.full_name,
      created_at: profile.created_at || new Date().toISOString(),
      updated_at: profile.updated_at || new Date().toISOString(),
      role: userRole,
      status: (profile.status as 'active' | 'suspended' | 'banned') || 'active',
      account_locked: (profile as any).account_locked ?? false,
      can_purchase_plans: profile.can_purchase_plans ?? true,
      subscription: userSub ? {
        id: userSub.id,
        plan_id: userSub.plan_id,
        status: userSub.status,
        current_period_start: userSub.current_period_start,
        current_period_end: userSub.current_period_end,
        plan: {
          name: (userSub.subscription_plans as any).name || '',
          display_name: (userSub.subscription_plans as any).display_name || '',
          price: (userSub.subscription_plans as any).price || 0,
          max_telegram_channels: (userSub.subscription_plans as any).max_telegram_channels || 1,
          quiz_manual_only: (userSub.subscription_plans as any).quiz_manual_only ?? false,
          has_ai_writing: (userSub.subscription_plans as any).has_ai_writing ?? false,
          question_bank_private_only: (userSub.subscription_plans as any).question_bank_private_only ?? false,
        },
      } : null,
      usage: userUsage || null,
    };
  });

  // Filter by role if provided (client-side since we can't join in supabase easily)
  if (roleFilter) {
    users = users.filter(u => u.role === roleFilter);
  }

  // Sort users: regular users first (by created_at desc), then super_admins at the bottom
  users.sort((a, b) => {
    // If one is super_admin and other is not, super_admin goes to bottom
    if (a.role === 'super_admin' && b.role !== 'super_admin') return 1;
    if (a.role !== 'super_admin' && b.role === 'super_admin') return -1;
    // Same role, sort by created_at descending (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return {
    users,
    totalCount: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize)
  };
}

/**
 * Get all users with their subscription details (super admin only)
 * @deprecated Use getPaginatedUsers for better performance
 */
export async function getAllUsers(): Promise<UserWithSubscription[]> {
  const result = await getPaginatedUsers(1, 1000);
  return result.users;
}

/**
 * Update user's subscription plan (super admin only)
 */
export async function updateUserSubscription(
  userId: string,
  planId: string,
  periodEnd?: string
): Promise<void> {
  // Check if user already has a subscription
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, current_period_start')
    .eq('user_id', userId)
    .maybeSingle();

  const now = new Date();
  const defaultPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  if (existingSub) {
    // Update existing subscription, keep current_period_start if exists
    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan_id: planId,
        status: 'active',
        current_period_start: existingSub.current_period_start || now.toISOString(),
        current_period_end: periodEnd || defaultPeriodEnd.toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating subscription:', error);
      throw new Error(error.message);
    }
  } else {
    // Create new subscription
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd || defaultPeriodEnd.toISOString(),
      });

    if (error) {
      console.error('Error creating subscription:', error);
      throw new Error(error.message);
    }
  }

  // Initialize usage tracking if it doesn't exist
  const { data: existingUsage } = await supabase
    .from('usage_tracking')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existingUsage) {
    await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
      });
  }
}

/**
 * Extend user's subscription duration (super admin only)
 */
export async function extendUserSubscription(
  userId: string,
  daysToAdd: number
): Promise<void> {
  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (fetchError || !subscription) {
    throw new Error('No active subscription found for this user');
  }

  const currentEnd = new Date(subscription.current_period_end);
  const newEnd = new Date(currentEnd.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from('subscriptions')
    .update({
      current_period_end: newEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('Error extending subscription:', error);
    throw new Error(error.message);
  }
}

/**
 * Set custom subscription end date (super admin only)
 */
export async function setCustomSubscriptionEndDate(
  userId: string,
  endDate: string
): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      current_period_end: endDate,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('Error setting custom end date:', error);
    throw new Error(error.message);
  }
}

/**
 * Update user role (super admin only)
 * Uses the user_roles table for proper role management
 */
export async function updateUserRole(
  userId: string,
  role: AppRole
): Promise<void> {
  if (role === 'user') {
    // Remove from user_roles table (default to user)
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing user role:', error);
      throw new Error(error.message);
    }
  } else {
    // Check if user already has a role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRole) {
      // Update existing role
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        throw new Error(error.message);
      }
    } else {
      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) {
        console.error('Error inserting user role:', error);
        throw new Error(error.message);
      }
    }
  }
}

/**
 * Update user status (super admin only)
 */
export async function updateUserStatus(
  userId: string,
  status: 'active' | 'suspended' | 'banned'
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user status:', error);
    throw new Error(error.message);
  }
}

/**
 * Toggle user's ability to purchase plans (super admin only)
 */
export async function toggleUserPurchaseAbility(
  userId: string,
  canPurchase: boolean
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ can_purchase_plans: canPurchase })
    .eq('id', userId);

  if (error) {
    console.error('Error updating purchase ability:', error);
    throw new Error(error.message);
  }
}

/**
 * Get subscription statistics (super admin only)
 */
export async function getSubscriptionStats() {
  const [plansResult, subsResult, paymentsResult] = await Promise.all([
    supabase.from('subscription_plans').select('id, name, display_name, price'),
    supabase.from('subscriptions').select('plan_id, status'),
    (supabase as any).from('subscription_payments').select('amount, payment_status')
  ]);

  if (!plansResult.data || !subsResult.data) {
    return {
      totalUsers: 0,
      activeSubscriptions: 0,
      totalRevenue: 0,
      planDistribution: [],
      recentActivity: []
    };
  }

  const plans = plansResult.data;
  const subscriptions = subsResult.data;
  const payments = paymentsResult.data || [];

  const totalRevenue = (payments as any[])
    .filter((p: any) => p.payment_status === 'captured' || p.payment_status === 'completed' || p.payment_status === 'success')
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  const planCounts = plans.map(plan => ({
    planId: plan.id,
    planName: plan.display_name,
    count: subscriptions.filter(s => s.plan_id === plan.id && s.status === 'active').length,
    price: plan.price
  }));

  // Fetch 5 most recent activities
  const { data: recentActivity } = await supabase
    .from('subscriptions')
    .select(`
      id,
      created_at,
      status,
      profiles (full_name, email),
      subscription_plans (display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    totalUsers: subscriptions.length,
    activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
    totalRevenue,
    planDistribution: planCounts,
    recentActivity: recentActivity || []
  };
}

/**
 * Get all available subscription plans (super admin only)
 */
export async function getSubscriptionPlans() {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching subscription plans:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update a subscription plan (super admin only)
 */
export async function updateSubscriptionPlan(
  planId: string,
  updates: Record<string, any>
) {
  const { data, error } = await (supabase as any)
    .from('subscription_plans')
    .update(updates)
    .eq('id', planId)
    .select()
    .single();

  if (error) {
    console.error('Error updating subscription plan:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Create a new subscription plan (super admin only)
 */
export async function createSubscriptionPlan(
  plan: Record<string, any>
) {
  const { data, error } = await supabase
    .from('subscription_plans')
    .insert(plan as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating subscription plan:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Delete a subscription plan (super admin only)
 */
export async function deleteSubscriptionPlan(planId: string) {
  const { error } = await supabase
    .from('subscription_plans')
    .delete()
    .eq('id', planId);

  if (error) {
    console.error('Error deleting subscription plan:', error);
    throw new Error(error.message);
  }
}

/**
 * Get coupon statistics (super admin only)
 */
export async function getCouponStats() {
  const { data: coupons } = await supabase
    .from('coupons')
    .select('id, code, current_uses, max_uses, is_active');

  const { data: usage } = await supabase
    .from('coupon_usage')
    .select('discount_amount');

  if (!coupons || !usage) {
    return {
      totalCoupons: 0,
      activeCoupons: 0,
      totalUsage: 0,
      totalDiscount: 0,
    };
  }

  const totalDiscount = usage.reduce((sum, u) => sum + (u.discount_amount || 0), 0);

  return {
    totalCoupons: coupons.length,
    activeCoupons: coupons.filter(c => c.is_active).length,
    totalUsage: usage.length,
    totalDiscount,
  };
}

/**
 * Search users by email or name (super admin only)
 */
export async function searchUsers(query: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error('Error searching users:', error);
    throw new Error(error.message);
  }

  return (data || []).map(p => ({
    id: p.id,
    email: p.email || '',
    full_name: p.full_name,
    role: 'user' as AppRole,
    status: (p.status as 'active' | 'suspended' | 'banned') || 'active',
    can_purchase_plans: p.can_purchase_plans ?? true,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
}

/**
 * Get user details by ID (super admin only)
 */
export async function getUserDetails(userId: string): Promise<UserWithSubscription | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  // Fetch additional data
  const [subscriptionResult, usageResult, roleResult] = await Promise.all([
    supabase
      .from('subscriptions')
      .select(`
        id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        subscription_plans (
          name,
          display_name,
          price,
          max_telegram_channels,
          quiz_manual_only,
          has_ai_writing,
          question_bank_private_only
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('usage_tracking')
      .select('quizzes_generated_this_month, pdfs_uploaded_this_month, total_storage_used_bytes')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
  ]);

  const userSub = subscriptionResult.data;
  const userRole = (roleResult.data?.role as AppRole) || 'user';

  return {
    id: profile.id,
    email: profile.email || '',
    full_name: profile.full_name,
    role: userRole,
    status: (profile.status as 'active' | 'suspended' | 'banned') || 'active',
    can_purchase_plans: profile.can_purchase_plans ?? true,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    subscription: userSub ? {
      id: userSub.id,
      plan_id: userSub.plan_id,
      status: userSub.status,
      current_period_start: userSub.current_period_start,
      current_period_end: userSub.current_period_end,
      plan: {
        name: (userSub.subscription_plans as any).name || '',
        display_name: (userSub.subscription_plans as any).display_name || '',
        price: (userSub.subscription_plans as any).price || 0,
        max_telegram_channels: (userSub.subscription_plans as any).max_telegram_channels || 1,
        quiz_manual_only: (userSub.subscription_plans as any).quiz_manual_only ?? false,
        has_ai_writing: (userSub.subscription_plans as any).has_ai_writing ?? false,
        question_bank_private_only: (userSub.subscription_plans as any).question_bank_private_only ?? false,
      },
    } : null,
    usage: usageResult.data || null,
  };
}

/**
 * Cancel user subscription (super admin only)
 */
export async function cancelUserSubscription(userId: string): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('Error cancelling subscription:', error);
    throw new Error(error.message);
  }
}

/**
 * Reset a user's password (super admin only)
 * Calls the admin-reset-password edge function
 */
export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-reset-password', {
    body: { userId, newPassword },
  });

  if (error) {
    console.error('Error resetting password:', error);
    throw new Error(error.message || 'Failed to reset password');
  }

  if (data?.error) {
    throw new Error(data.error);
  }
}
