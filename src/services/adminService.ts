import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput, validateInteger } from "@/utils/security";
import { obfuscateForLog } from "@/utils/encryption";

export type UserRole = 'user' | 'admin' | 'super_admin';
export type UserStatus = 'active' | 'suspended' | 'banned';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  can_purchase_plans: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithSubscription extends UserProfile {
  subscription?: {
    plan_name: string;
    status: string;
    current_period_end: string;
  } | null;
}

export interface AdminActivityLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  details: any;
  created_at: string;
}

export class AdminService {
  /**
   * Check if current user is super admin
   */
  static async isSuperAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data?.role === 'super_admin';
    } catch (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
  }

  /**
   * Check if current user is admin (admin or super_admin)
   */
  static async isAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data?.role === 'admin' || data?.role === 'super_admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Get current user's profile with role
   */
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    } catch (error) {
      console.error('Error getting current user profile:', error);
      return null;
    }
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(): Promise<UserWithSubscription[]> {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get subscriptions for all users
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          user_id,
          status,
          current_period_end,
          plan_id,
          subscription_plans (
            name
          )
        `)
        .eq('status', 'active');

      if (subsError) throw subsError;

      // Merge profiles with subscriptions
      const users: UserWithSubscription[] = profiles.map(profile => {
        const subscription = subscriptions?.find(sub => sub.user_id === profile.id);
        return {
          ...profile,
          subscription: subscription ? {
            plan_name: (subscription as any).subscription_plans?.name || 'Unknown',
            status: subscription.status,
            current_period_end: subscription.current_period_end
          } : null
        };
      });

      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Update user role (super admin only)
   */
  static async updateUserRole(userId: string, newRole: UserRole): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: userId,
        new_role: newRole
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Toggle user's purchase permission (super admin only)
   */
  static async togglePurchasePermission(userId: string, canPurchase: boolean): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('admin_toggle_purchase_permission', {
        target_user_id: userId,
        can_purchase: canPurchase
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling purchase permission:', error);
      throw error;
    }
  }

  /**
   * Get admin activity log
   */
  static async getActivityLog(limit: number = 50): Promise<AdminActivityLog[]> {
    try {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AdminActivityLog[];
    } catch (error) {
      console.error('Error getting activity log:', error);
      throw error;
    }
  }

  /**
   * Log admin activity (for custom actions)
   */
  static async logActivity(
    action: string,
    targetUserId?: string,
    details?: any
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('admin_activity_log')
        .insert({
          admin_id: user.id,
          action,
          target_user_id: targetUserId || null,
          details: details || {}
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging admin activity:', error);
      // Don't throw - logging failure shouldn't break the operation
    }
  }

  /**
   * Get user statistics (for admin dashboard)
   */
  static async getUserStatistics(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    totalAdmins: number;
    usersWithPurchaseRestrictions: number;
  }> {
    try {
      // Get total users and role statistics
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('role, can_purchase_plans');

      if (profilesError) throw profilesError;

      // Get active subscriptions count
      const { count: activeSubsCount, error: subsError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (subsError) throw subsError;

      const totalUsers = profiles?.length || 0;
      const totalAdmins = profiles?.filter(p => p.role === 'admin' || p.role === 'super_admin').length || 0;
      const usersWithPurchaseRestrictions = profiles?.filter(p => !p.can_purchase_plans).length || 0;

      return {
        totalUsers,
        activeSubscriptions: activeSubsCount || 0,
        totalAdmins,
        usersWithPurchaseRestrictions
      };
    } catch (error) {
      console.error('Error getting user statistics:', error);
      throw error;
    }
  }

  /**
   * Search users by email or name with sanitization
   */
  static async searchUsers(query: string): Promise<UserWithSubscription[]> {
    try {
      const sanitizedQuery = sanitizeInput(query.toLowerCase());
      if (!sanitizedQuery || sanitizedQuery.length < 2) {
        return [];
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${sanitizedQuery}%,full_name.ilike.%${sanitizedQuery}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (profilesError) throw profilesError;

      // Get subscriptions
      const userIds = profiles?.map(p => p.id) || [];
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select(`
          user_id,
          status,
          current_period_end,
          subscription_plans (name)
        `)
        .in('user_id', userIds)
        .eq('status', 'active');

      const users: UserWithSubscription[] = (profiles || []).map(profile => {
        const subscription = subscriptions?.find(sub => sub.user_id === profile.id);
        return {
          ...profile,
          subscription: subscription ? {
            plan_name: (subscription as any).subscription_plans?.name || 'Unknown',
            status: subscription.status,
            current_period_end: subscription.current_period_end
          } : null
        };
      });

      this.logActivity('user_search', undefined, { query: sanitizedQuery });
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get detailed user information (super admin only)
   */
  static async getUserDetails(userId: string): Promise<any> {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Get user's channels (without sensitive tokens)
      const { data: channels } = await supabase
        .from('channels')
        .select('id, name, telegram_channel_id, is_active, created_at')
        .eq('user_id', userId);

      // Get user's quiz generations count
      const { count: quizCount } = await supabase
        .from('quiz_generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get user's documents count
      const { count: docCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      // Get usage tracking
      const { data: usage } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .single();

      this.logActivity('view_user_details', userId);

      return {
        profile,
        channels: channels || [],
        quizCount: quizCount || 0,
        documentCount: docCount || 0,
        subscription,
        usage
      };
    } catch (error) {
      console.error('Error getting user details:', error);
      throw error;
    }
  }

  /**
   * Bulk update user roles (super admin only)
   */
  static async bulkUpdateRoles(userIds: string[], newRole: UserRole): Promise<void> {
    try {
      const results = await Promise.allSettled(
        userIds.map(userId => this.updateUserRole(userId, newRole))
      );

      const failed = results.filter(r => r.status === 'rejected').length;
      const succeeded = results.filter(r => r.status === 'fulfilled').length;

      this.logActivity('bulk_role_update', undefined, {
        role: newRole,
        userCount: userIds.length,
        succeeded,
        failed
      });

      if (failed > 0) {
        throw new Error(`${failed} role updates failed`);
      }
    } catch (error) {
      console.error('Error in bulk role update:', error);
      throw error;
    }
  }

  /**
   * Delete user account (super admin only - DANGEROUS)
   */
  static async deleteUser(userId: string, reason: string): Promise<void> {
    try {
      // Log before deletion
      this.logActivity('user_deletion_attempt', userId, { reason });

      // Note: Actual deletion should be done via Supabase admin API
      // This is a placeholder for triggering the deletion flow
      const { error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userId
      });

      if (error) throw error;

      this.logActivity('user_deleted', userId, { reason });
    } catch (error) {
      console.error('Error deleting user:', error);
      this.logActivity('user_deletion_failed', userId, { error: String(error) });
      throw error;
    }
  }

  /**
   * Get activity log with advanced filtering
   */
  static async getFilteredActivityLog(options: {
    limit?: number;
    action?: string;
    adminId?: string;
    targetUserId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<AdminActivityLog[]> {
    try {
      let query = supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (options.action) {
        query = query.eq('action', sanitizeInput(options.action));
      }

      if (options.adminId) {
        query = query.eq('admin_id', options.adminId);
      }

      if (options.targetUserId) {
        query = query.eq('target_user_id', options.targetUserId);
      }

      if (options.fromDate) {
        query = query.gte('created_at', options.fromDate);
      }

      if (options.toDate) {
        query = query.lte('created_at', options.toDate);
      }

      const limit = validateInteger(options.limit || 50, 1, 1000);
      if (limit.isValid && limit.value) {
        query = query.limit(limit.value);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AdminActivityLog[];
    } catch (error) {
      console.error('Error getting filtered activity log:', error);
      throw error;
    }
  }

  /**
   * Get system security metrics
   */
  static async getSecurityMetrics(): Promise<{
    failedLoginAttempts24h: number;
    suspiciousActivities: number;
    activeAdminSessions: number;
    recentRoleChanges: number;
  }> {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Get failed login attempts (from activity log)
      const { count: failedLogins } = await supabase
        .from('admin_activity_log')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'failed_login')
        .gte('created_at', yesterday);

      // Get suspicious activities
      const { count: suspicious } = await supabase
        .from('admin_activity_log')
        .select('*', { count: 'exact', head: true })
        .in('action', ['user_deletion_attempt', 'bulk_role_update', 'security_alert'])
        .gte('created_at', yesterday);

      // Get recent role changes
      const { count: roleChanges } = await supabase
        .from('admin_activity_log')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'update_user_role')
        .gte('created_at', yesterday);

      return {
        failedLoginAttempts24h: failedLogins || 0,
        suspiciousActivities: suspicious || 0,
        activeAdminSessions: 0, // Placeholder - would need session tracking
        recentRoleChanges: roleChanges || 0
      };
    } catch (error) {
      console.error('Error getting security metrics:', error);
      throw error;
    }
  }

  /**
   * Export user data (GDPR compliance)
   */
  static async exportUserData(userId: string): Promise<any> {
    try {
      const details = await this.getUserDetails(userId);

      // Get all user's quizzes
      const { data: quizzes } = await supabase
        .from('quiz_generations')
        .select('*')
        .eq('user_id', userId);

      // Get all user's documents
      const { data: documents } = await supabase
        .from('documents')
        .select('id, file_name, file_size_bytes, processing_status, created_at')
        .eq('user_id', userId);

      // Get all user's question bank items
      const { data: questions } = await supabase
        .from('question_banks')
        .select('*')
        .eq('user_id', userId);

      this.logActivity('data_export', userId);

      return {
        profile: details.profile,
        channels: details.channels,
        subscription: details.subscription,
        usage: details.usage,
        quizzes: quizzes || [],
        documents: documents || [],
        questions: questions || []
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Impersonate user (super admin only - for support purposes)
   * Note: This logs the action for audit purposes
   */
  static async impersonateUser(userId: string, reason: string): Promise<void> {
    try {
      this.logActivity('user_impersonation', userId, {
        reason,
        warning: 'SECURITY: Admin impersonation occurred'
      });

      // In production, implement proper impersonation with:
      // 1. Time-limited token
      // 2. Clear UI indication
      // 3. Restricted actions
      // 4. Automatic logout after time period

      console.warn('Impersonation logged:', obfuscateForLog({ userId, reason }));
    } catch (error) {
      console.error('Error logging impersonation:', error);
      throw error;
    }
  }

  /**
   * Create security alert
   */
  static async createSecurityAlert(
    alertType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any
  ): Promise<void> {
    try {
      await this.logActivity('security_alert', undefined, {
        alertType,
        severity,
        details: obfuscateForLog(details)
      });

      // In production, also send notification to super admins via email/SMS
    } catch (error) {
      console.error('Error creating security alert:', error);
    }
  }

  /**
   * Get admin performance metrics
   */
  static async getAdminMetrics(adminId: string, days: number = 30): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    usersAffected: number;
  }> {
    try {
      const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data: activities } = await supabase
        .from('admin_activity_log')
        .select('action, target_user_id')
        .eq('admin_id', adminId)
        .gte('created_at', fromDate);

      const actionsByType: Record<string, number> = {};
      const uniqueUsers = new Set<string>();

      (activities || []).forEach(activity => {
        actionsByType[activity.action] = (actionsByType[activity.action] || 0) + 1;
        if (activity.target_user_id) {
          uniqueUsers.add(activity.target_user_id);
        }
      });

      return {
        totalActions: activities?.length || 0,
        actionsByType,
        usersAffected: uniqueUsers.size
      };
    } catch (error) {
      console.error('Error getting admin metrics:', error);
      throw error;
    }
  }
}
