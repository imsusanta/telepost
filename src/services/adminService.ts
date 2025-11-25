import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/security";

export type UserRole = 'user';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
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

export class AdminService {
  /**
   * Get current user's profile
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
   * Get all users
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
            plan_name: (subscription as Record<string, unknown>).subscription_plans as { name: string } | undefined
              ? ((subscription as Record<string, unknown>).subscription_plans as { name: string }).name
              : 'Unknown',
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
   * Get user statistics
   */
  static async getUserStatistics(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
  }> {
    try {
      // Get total users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');

      if (profilesError) throw profilesError;

      // Get active subscriptions count
      const { count: activeSubsCount, error: subsError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (subsError) throw subsError;

      const totalUsers = profiles?.length || 0;

      return {
        totalUsers,
        activeSubscriptions: activeSubsCount || 0,
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
            plan_name: (subscription as Record<string, unknown>).subscription_plans as { name: string } | undefined
              ? ((subscription as Record<string, unknown>).subscription_plans as { name: string }).name
              : 'Unknown',
            status: subscription.status,
            current_period_end: subscription.current_period_end
          } : null
        };
      });

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get detailed user information
   */
  static async getUserDetails(userId: string): Promise<{
    profile: UserProfile;
    channels: Array<{ id: string; name: string; telegram_channel_id?: string; is_active?: boolean; created_at: string }>;
    quizCount: number;
    documentCount: number;
    subscription: unknown;
    usage: unknown;
  }> {
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
   * Export user data (GDPR compliance)
   */
  static async exportUserData(userId: string): Promise<{
    profile: UserProfile;
    channels: Array<{ id: string; name: string; telegram_channel_id?: string; is_active?: boolean; created_at: string }>;
    subscription: unknown;
    usage: unknown;
    quizzes: unknown[];
    documents: unknown[];
    questions: unknown[];
  }> {
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
}
