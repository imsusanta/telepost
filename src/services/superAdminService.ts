import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role?: 'user' | 'admin' | 'super_admin';
  can_purchase_plans: boolean;
  status?: 'active' | 'suspended' | 'banned';
  last_login?: string | null;
  login_count?: number;
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
  searchQuery?: string
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

  // Fetch subscriptions and usage for these users in parallel
  const [subscriptionsResult, usageResult] = await Promise.all([
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
          price
        )
      `)
      .in('user_id', userIds)
      .eq('status', 'active'),
    supabase
      .from('usage_tracking')
      .select('user_id, quizzes_generated_this_month, pdfs_uploaded_this_month, total_storage_used_bytes')
      .in('user_id', userIds)
  ]);

  if (subscriptionsResult.error) {
    console.error('Error fetching subscriptions:', subscriptionsResult.error);
  }

  if (usageResult.error) {
    console.error('Error fetching usage:', usageResult.error);
  }

  // Create lookup maps for O(1) access
  const subscriptionMap = new Map(
    (subscriptionsResult.data || []).map(s => [s.user_id, s])
  );
  const usageMap = new Map(
    (usageResult.data || []).map(u => [u.user_id, u])
  );

  // Combine the data
  const users: UserWithSubscription[] = profiles.map(profile => {
    const userSub = subscriptionMap.get(profile.id);
    const userUsage = usageMap.get(profile.id);

    return {
      ...profile,
      role: 'user' as const,
      status: 'active' as const,
      last_login: null,
      login_count: 0,
      can_purchase_plans: profile.can_purchase_plans ?? true,
      subscription: userSub ? {
        id: userSub.id,
        plan_id: userSub.plan_id,
        status: userSub.status,
        current_period_start: userSub.current_period_start,
        current_period_end: userSub.current_period_end,
        plan: userSub.subscription_plans as any,
      } : null,
      usage: userUsage || null,
    };
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
  // Fetch all data in parallel for better performance
  const [profilesResult, subscriptionsResult, usageResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false }),
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
          price
        )
      `)
      .eq('status', 'active'),
    supabase
      .from('usage_tracking')
      .select('user_id, quizzes_generated_this_month, pdfs_uploaded_this_month, total_storage_used_bytes')
  ]);

  if (profilesResult.error) {
    console.error('Error fetching profiles:', profilesResult.error);
    throw new Error(profilesResult.error.message);
  }

  if (!profilesResult.data || profilesResult.data.length === 0) {
    return [];
  }

  if (subscriptionsResult.error) {
    console.error('Error fetching subscriptions:', subscriptionsResult.error);
  }

  if (usageResult.error) {
    console.error('Error fetching usage:', usageResult.error);
  }

  // Create lookup maps for O(1) access instead of O(n) find operations
  const subscriptionMap = new Map(
    (subscriptionsResult.data || []).map(s => [s.user_id, s])
  );
  const usageMap = new Map(
    (usageResult.data || []).map(u => [u.user_id, u])
  );

  // Combine the data using maps for O(n) instead of O(n²)
  const users: UserWithSubscription[] = profilesResult.data.map(profile => {
    const userSub = subscriptionMap.get(profile.id);
    const userUsage = usageMap.get(profile.id);

    return {
      ...profile,
      role: 'user' as const,
      status: 'active' as const,
      last_login: null,
      login_count: 0,
      can_purchase_plans: profile.can_purchase_plans ?? true,
      subscription: userSub ? {
        id: userSub.id,
        plan_id: userSub.plan_id,
        status: userSub.status,
        current_period_start: userSub.current_period_start,
        current_period_end: userSub.current_period_end,
        plan: userSub.subscription_plans as any,
      } : null,
      usage: userUsage || null,
    };
  });

  return users;
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
    .select('id')
    .eq('user_id', userId)
    .single();

  const now = new Date();
  const defaultPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  if (existingSub) {
    // Update existing subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan_id: planId,
        status: 'active',
        current_period_start: now.toISOString(),
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
    .single();

  if (!existingUsage) {
    await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        current_period_start: now.toISOString(),
      });
  }
}

/**
 * Update user role (super admin only)
 */
export async function updateUserRole(
  userId: string,
  role: 'user' | 'admin' | 'super_admin'
): Promise<void> {
  // Note: role field may not exist in profiles table schema
  // This function may need database schema updates to work properly
  const { error } = await (supabase
    .from('profiles')
    .update as any)({ role })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user role:', error);
    throw new Error(error.message);
  }
}

/**
 * Update user status (super admin only)
 */
export async function updateUserStatus(
  userId: string,
  status: 'active' | 'suspended' | 'banned'
): Promise<void> {
  // Note: status field may not exist in profiles table schema
  // This function may need database schema updates to work properly
  const { error } = await (supabase
    .from('profiles')
    .update as any)({ status })
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
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name, display_name');

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('plan_id, status');

  if (!plans || !subscriptions) {
    return {
      totalUsers: 0,
      activeSubscriptions: 0,
      planDistribution: [],
    };
  }

  const planCounts = plans.map(plan => ({
    planName: plan.display_name,
    count: subscriptions.filter(s => s.plan_id === plan.id && s.status === 'active').length,
  }));

  return {
    totalUsers: subscriptions.length,
    activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
    planDistribution: planCounts,
  };
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

  const totalDiscount = usage.reduce((sum, u) => sum + Number(u.discount_amount), 0);

  return {
    totalCoupons: coupons.length,
    activeCoupons: coupons.filter(c => c.is_active).length,
    totalUsage: usage.length,
    totalDiscount,
  };
}

/**
 * Cancel user subscription (super admin only)
 */
export async function cancelUserSubscription(
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: true,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error canceling subscription:', error);
    throw new Error(error.message);
  }
}

/**
 * Search users by email or name (super admin only)
 */
export async function searchUsers(query: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error searching users:', error);
    throw new Error(error.message);
  }

  return (data || []).map(profile => ({
    ...profile,
    role: 'user' as const,
    status: 'active' as const,
    last_login: null,
    login_count: 0,
    can_purchase_plans: profile.can_purchase_plans ?? true,
  }));
}

/**
 * Get user details by ID (super admin only)
 */
export async function getUserDetails(userId: string): Promise<UserWithSubscription | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching profile:', profileError);
    return null;
  }

  const { data: subscription } = await supabase
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
        price
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('quizzes_generated_this_month, pdfs_uploaded_this_month, total_storage_used_bytes')
    .eq('user_id', userId)
    .single();

  return {
    ...profile,
    role: 'user' as const,
    status: 'active' as const,
    last_login: null,
    login_count: 0,
    can_purchase_plans: profile.can_purchase_plans ?? true,
    subscription: subscription ? {
      id: subscription.id,
      plan_id: subscription.plan_id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      plan: subscription.subscription_plans as any,
    } : null,
    usage: usage || null,
  };
}
