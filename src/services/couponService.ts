import { supabase } from '@/integrations/supabase/client';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  max_uses_per_user: number | null;
  valid_from: string;
  valid_until: string | null;
  applicable_plans: string[] | null;
  min_purchase_amount: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  user_id: string;
  subscription_id: string | null;
  discount_amount: number;
  original_amount: number;
  final_amount: number;
  used_at: string;
}

export interface CouponValidationResult {
  is_valid: boolean;
  error_message: string | null;
  coupon_id: string | null;
  discount_type: string | null;
  discount_value: number | null;
  discount_amount: number | null;
  final_amount: number | null;
}

/**
 * Get all coupons (super admin only)
 */
export async function getAllCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching coupons:', error);
    throw new Error(error.message);
  }

  return (data || []) as Coupon[];
}

/**
 * Create a new coupon (super admin only)
 */
export async function createCoupon(couponData: {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_uses?: number;
  max_uses_per_user?: number;
  valid_from?: string;
  valid_until?: string;
  applicable_plans?: string[];
  min_purchase_amount?: number;
}): Promise<Coupon> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      ...couponData,
      created_by: user.id,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating coupon:', error);
    throw new Error(error.message);
  }

  return data as Coupon;
}

/**
 * Update a coupon (super admin only)
 */
export async function updateCoupon(
  couponId: string,
  updates: Partial<Coupon>
): Promise<Coupon> {
  const { data, error } = await supabase
    .from('coupons')
    .update(updates)
    .eq('id', couponId)
    .select()
    .single();

  if (error) {
    console.error('Error updating coupon:', error);
    throw new Error(error.message);
  }

  return data as Coupon;
}

/**
 * Delete a coupon (super admin only)
 */
export async function deleteCoupon(couponId: string): Promise<void> {
  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', couponId);

  if (error) {
    console.error('Error deleting coupon:', error);
    throw new Error(error.message);
  }
}

/**
 * Toggle coupon active status (super admin only)
 */
export async function toggleCouponStatus(
  couponId: string,
  isActive: boolean
): Promise<Coupon> {
  return updateCoupon(couponId, { is_active: isActive });
}

/**
 * Validate a coupon code
 */
export async function validateCoupon(
  couponCode: string,
  planName: string,
  purchaseAmount: number
): Promise<CouponValidationResult> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      is_valid: false,
      error_message: 'Not authenticated',
      coupon_id: null,
      discount_type: null,
      discount_value: null,
      discount_amount: null,
      final_amount: null,
    };
  }

  const { data, error } = await supabase
    .rpc('validate_coupon', {
      p_coupon_code: couponCode,
      p_user_id: user.id,
      p_plan_name: planName,
      p_purchase_amount: purchaseAmount,
    });

  if (error) {
    console.error('Error validating coupon:', error);
    return {
      is_valid: false,
      error_message: error.message,
      coupon_id: null,
      discount_type: null,
      discount_value: null,
      discount_amount: null,
      final_amount: null,
    };
  }

  // The RPC function returns an array with one result
  return data && data.length > 0 ? data[0] : {
    is_valid: false,
    error_message: 'Unknown error',
    coupon_id: null,
    discount_type: null,
    discount_value: null,
    discount_amount: null,
    final_amount: null,
  };
}

/**
 * Apply a coupon after subscription creation
 */
export async function applyCoupon(
  couponCode: string,
  subscriptionId: string,
  discountAmount: number,
  originalAmount: number,
  finalAmount: number
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .rpc('apply_coupon', {
      p_coupon_code: couponCode,
      p_user_id: user.id,
      p_subscription_id: subscriptionId,
      p_discount_amount: discountAmount,
      p_original_amount: originalAmount,
      p_final_amount: finalAmount,
    });

  if (error) {
    console.error('Error applying coupon:', error);
    throw new Error(error.message);
  }

  return data === true;
}

/**
 * Get coupon usage history (super admin only)
 */
export async function getCouponUsageHistory(
  couponId?: string
): Promise<CouponUsage[]> {
  let query = supabase
    .from('coupon_usage')
    .select(`
      *,
      coupons (code, description),
      profiles:user_id (email, full_name)
    `)
    .order('used_at', { ascending: false });

  if (couponId) {
    query = query.eq('coupon_id', couponId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching coupon usage:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get user's coupon usage
 */
export async function getUserCouponUsage(): Promise<CouponUsage[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('coupon_usage')
    .select(`
      *,
      coupons (code, description)
    `)
    .eq('user_id', user.id)
    .order('used_at', { ascending: false });

  if (error) {
    console.error('Error fetching user coupon usage:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Generate a random coupon code
 */
export function generateCouponCode(prefix: string = '', length: number = 8): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix.toUpperCase();

  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return code;
}

/**
 * Check if current user is super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .rpc('is_super_admin', { p_user_id: user.id });

  if (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }

  return data === true;
}

/**
 * Check if current user is admin or super admin
 */
export async function isAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .rpc('is_admin', { p_user_id: user.id });

  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }

  return data === true;
}
