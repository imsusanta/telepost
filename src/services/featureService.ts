import { supabase } from "@/integrations/supabase/client";

// ==========================================
// TYPES
// ==========================================

export interface SystemFeature {
    id: string;
    feature_key: string;
    display_name: string;
    description: string | null;
    is_enabled: boolean;
    is_core_feature: boolean;
    updated_by: string | null;
    updated_at: string;
}

export interface UserApprovalStatus {
    status: 'pending' | 'approved' | 'rejected';
    approved_at: string | null;
    rejection_reason: string | null;
}

export interface UserPaymentStatus {
    payment_status: 'pending' | 'paid' | 'locked';
    payment_requested_at: string | null;
    payment_amount: number | null;
    razorpay_order_id: string | null;
    payment_expires_at: string | null;
}

export interface UserFullStatus {
    approval: UserApprovalStatus;
    payment: UserPaymentStatus;
    canAccessFeatures: boolean;
}

export type FeatureKey = 'telegram_quiz' | 'lms_attendance';

// ==========================================
// SYSTEM FEATURES (Global Toggles)
// ==========================================

/**
 * Get all system features
 * Note: Uses 'any' to bypass TypeScript until Supabase types are regenerated
 */
export async function getSystemFeatures(): Promise<SystemFeature[]> {
    const { data, error } = await (supabase as any)
        .from('system_features')
        .select('*')
        .order('feature_key');

    if (error) throw new Error(`Failed to load system features: ${error.message}`);
    return (data || []) as SystemFeature[];
}

/**
 * Check if a specific feature is enabled
 */
export async function isFeatureEnabled(featureKey: FeatureKey): Promise<boolean> {
    const { data, error } = await (supabase as any)
        .from('system_features')
        .select('is_enabled')
        .eq('feature_key', featureKey)
        .single();

    if (error) {
        console.error(`Failed to check feature ${featureKey}:`, error);
        return true; // Default to enabled if check fails
    }

    return data?.is_enabled ?? true;
}

/**
 * Toggle a system feature (admin only)
 */
export async function toggleFeature(featureKey: FeatureKey, enabled: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await (supabase as any)
        .from('system_features')
        .update({
            is_enabled: enabled,
            updated_by: user.id,
            updated_at: new Date().toISOString()
        })
        .eq('feature_key', featureKey);

    if (error) throw new Error(`Failed to toggle feature: ${error.message}`);
}

// ==========================================
// USER APPROVAL
// ==========================================

/**
 * Get current user's approval status
 */
export async function getUserApprovalStatus(): Promise<UserApprovalStatus | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await (supabase as any)
        .from('profiles')
        .select('approval_status, approved_at, rejection_reason')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Failed to get approval status:', error);
        // Return approved by default if column doesn't exist yet
        return { status: 'approved', approved_at: null, rejection_reason: null };
    }

    return {
        status: data?.approval_status || 'pending',
        approved_at: data?.approved_at || null,
        rejection_reason: data?.rejection_reason || null
    };
}

/**
 * Check if current user is approved
 */
export async function isUserApproved(): Promise<boolean> {
    const status = await getUserApprovalStatus();
    return status?.status === 'approved';
}

/**
 * Get all pending users (admin only)
 */
export async function getPendingUsers() {
    const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, email, full_name, created_at, approval_status')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to load pending users: ${error.message}`);
    return data || [];
}

/**
 * Approve a user (admin only)
 */
export async function approveUser(userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await (supabase as any)
        .from('profiles')
        .update({
            approval_status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user.id,
            rejection_reason: null
        })
        .eq('id', userId);

    if (error) throw new Error(`Failed to approve user: ${error.message}`);
}

/**
 * Reject a user (admin only)
 */
export async function rejectUser(userId: string, reason?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await (supabase as any)
        .from('profiles')
        .update({
            approval_status: 'rejected',
            approved_by: user.id,
            rejection_reason: reason || 'No reason provided'
        })
        .eq('id', userId);

    if (error) throw new Error(`Failed to reject user: ${error.message}`);
}

/**
 * Get all users with their approval status (admin only)
 */
export async function getAllUsersWithApproval() {
    const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, email, full_name, created_at, approval_status, approved_at, rejection_reason, payment_status, payment_requested_at, payment_amount')
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to load users: ${error.message}`);
    return data || [];
}

// ==========================================
// FEATURE-BASED ACCESS CONTROL
// ==========================================

/**
 * Check if user has access to a feature (based on global toggle AND subscription)
 */
export async function hasFeatureAccess(featureKey: FeatureKey): Promise<boolean> {
    // First check if feature is globally enabled
    const globallyEnabled = await isFeatureEnabled(featureKey);
    if (!globallyEnabled) return false;

    // Then check user's subscription plan
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if user is approved AND has paid
    const fullStatus = await getUserFullStatus();
    return fullStatus?.canAccessFeatures ?? false;
}

// ==========================================
// PAYMENT STATUS
// ==========================================

/**
 * Get current user's payment status
 */
export async function getUserPaymentStatus(): Promise<UserPaymentStatus | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
        const { data, error } = await (supabase as any)
            .from('profiles')
            .select('payment_status, payment_requested_at, payment_amount, razorpay_order_id, payment_expires_at')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Failed to get payment status:', error);
            // Return 'paid' by default if column doesn't exist (backward compat = full access)
            return { payment_status: 'paid', payment_requested_at: null, payment_amount: null, razorpay_order_id: null, payment_expires_at: null };
        }

        // Only return 'locked' if explicitly set to 'locked', otherwise default to 'paid' for full access
        const status = data?.payment_status;
        const finalStatus = status === 'locked' ? 'locked' : 'paid';

        return {
            payment_status: finalStatus,
            payment_requested_at: data?.payment_requested_at || null,
            payment_amount: data?.payment_amount || null,
            razorpay_order_id: data?.razorpay_order_id || null,
            payment_expires_at: data?.payment_expires_at || null
        };
    } catch (e) {
        console.error('Exception getting payment status:', e);
        // On any exception, grant full access
        return { payment_status: 'paid', payment_requested_at: null, payment_amount: null, razorpay_order_id: null, payment_expires_at: null };
    }
}

/**
 * Get full user status (approval + payment)
 */
export async function getUserFullStatus(): Promise<UserFullStatus | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if user is super_admin or admin - they always have access
    const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // Super admins and admins bypass all payment checks
    if (profile?.role === 'super_admin') {
        return {
            approval: { status: 'approved', approved_at: null, rejection_reason: null },
            payment: { payment_status: 'paid', payment_requested_at: null, payment_amount: null, razorpay_order_id: null, payment_expires_at: null },
            canAccessFeatures: true
        };
    }

    const approval = await getUserApprovalStatus();
    const payment = await getUserPaymentStatus();

    if (!approval || !payment) return null;

    // With payment system removed, all authenticated users have access
    // The approval system is now the only gate (if still needed)
    // For simplicity, we're granting access to all authenticated users
    const canAccessFeatures = true;

    return {
        approval,
        payment,
        canAccessFeatures
    };
}

/**
 * Request payment lock - locks user account until payment is complete
 */
export async function requestPaymentLock(amount: number = 999): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await (supabase as any)
        .from('profiles')
        .update({
            payment_status: 'locked',
            payment_requested_at: new Date().toISOString(),
            payment_amount: amount
        })
        .eq('id', user.id);

    if (error) throw new Error(`Failed to request payment: ${error.message}`);
}

/**
 * Update payment status after successful Razorpay payment
 */
export async function updatePaymentSuccess(razorpayPaymentId: string, razorpayOrderId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await (supabase as any)
        .from('profiles')
        .update({
            payment_status: 'paid',
            razorpay_payment_id: razorpayPaymentId,
            razorpay_order_id: razorpayOrderId,
            payment_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        })
        .eq('id', user.id);

    if (error) throw new Error(`Failed to update payment status: ${error.message}`);
}

/**
 * Check if current user has paid
 */
export async function isUserPaid(): Promise<boolean> {
    const status = await getUserPaymentStatus();
    return status?.payment_status === 'paid';
}
