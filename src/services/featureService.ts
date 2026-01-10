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
        .select('id, email, full_name, created_at, approval_status, approved_at, rejection_reason')
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

    // For now, approved users have access to enabled features
    // In the future, this can check subscription-based access
    const isApproved = await isUserApproved();
    return isApproved;
}
