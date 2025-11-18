import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'user' | 'admin' | 'super_admin';

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
}
