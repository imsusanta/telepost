import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  price: number;
  billing_period: string;

  // Limits
  max_telegram_channels: number;
  max_pdf_storage_gb: number;
  max_quizzes_per_month: number | null;
  max_batch_quiz_generation: number;
  max_question_bank_size: number;

  // Features
  has_advanced_ai: boolean;
  has_auto_scheduling: boolean;
  has_auto_pdf_explanations: boolean;
  has_analytics_dashboard: boolean;
  has_leaderboards: boolean;
  has_custom_branding: boolean;
  has_multi_language: boolean;
  has_priority_support: boolean;
  has_api_access: boolean;
  has_white_label: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan?: SubscriptionPlan;
}

export interface UsageStats {
  quizzes_generated_this_month: number;
  pdfs_uploaded_this_month: number;
  total_quizzes_generated: number;
  total_pdfs_uploaded: number;
  total_storage_used_bytes: number;
}

export class SubscriptionService {
  /**
   * Get all available subscription plans
   */
  static async getPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get user's current subscription
   */
  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from("subscriptions")
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No subscription found
        return null;
      }
      throw error;
    }

    return data;
  }

  /**
   * Check if user can purchase plans
   */
  static async canPurchasePlans(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      return {
        allowed: false,
        reason: "Failed to verify purchase permissions"
      };
    }

    if (!profile.can_purchase_plans) {
      return {
        allowed: false,
        reason: "Your account does not have permission to purchase plans. Please contact support."
      };
    }

    return { allowed: true };
  }

  /**
   * Create a new subscription for a user
   */
  static async createSubscription(
    userId: string,
    planName: string
  ): Promise<UserSubscription> {
    // Check if user can purchase plans
    const purchaseCheck = await this.canPurchasePlans(userId);
    if (!purchaseCheck.allowed) {
      throw new Error(purchaseCheck.reason);
    }

    // Get the plan
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("name", planName)
      .single();

    if (planError) throw planError;

    // Create subscription
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: plan.id,
        status: "active",
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
      })
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .single();

    if (error) throw error;

    // Initialize usage tracking
    await this.initializeUsageTracking(userId);

    return data;
  }

  /**
   * Initialize usage tracking for a user
   */
  static async initializeUsageTracking(userId: string): Promise<void> {
    const { error } = await supabase
      .from("usage_tracking")
      .insert({
        user_id: userId,
        quizzes_generated_this_month: 0,
        pdfs_uploaded_this_month: 0,
        total_quizzes_generated: 0,
        total_pdfs_uploaded: 0,
        total_storage_used_bytes: 0,
      })
      .select()
      .single();

    // Ignore if already exists
    if (error && error.code !== "23505") {
      throw error;
    }
  }

  /**
   * Get user's usage statistics
   */
  static async getUserUsage(userId: string): Promise<UsageStats> {
    const { data, error } = await supabase
      .from("usage_tracking")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No usage tracking found, initialize it
        await this.initializeUsageTracking(userId);
        return {
          quizzes_generated_this_month: 0,
          pdfs_uploaded_this_month: 0,
          total_quizzes_generated: 0,
          total_pdfs_uploaded: 0,
          total_storage_used_bytes: 0,
        };
      }
      throw error;
    }

    return data;
  }

  /**
   * Check if user can perform an action based on their plan limits
   */
  static async canUserPerformAction(
    userId: string,
    action: "generate_quiz" | "upload_pdf" | "batch_quiz"
  ): Promise<{ allowed: boolean; reason?: string; limit?: number; current?: number }> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription || !subscription.plan) {
      return {
        allowed: false,
        reason: "No active subscription found. Please upgrade to continue.",
      };
    }

    const usage = await this.getUserUsage(userId);
    const plan = subscription.plan as unknown as SubscriptionPlan;

    switch (action) {
      case "generate_quiz":
        if (plan.max_quizzes_per_month === null) {
          return { allowed: true }; // Unlimited
        }
        if (usage.quizzes_generated_this_month >= plan.max_quizzes_per_month) {
          return {
            allowed: false,
            reason: `You've reached your monthly limit of ${plan.max_quizzes_per_month} quizzes. Upgrade to Pro for unlimited quizzes.`,
            limit: plan.max_quizzes_per_month,
            current: usage.quizzes_generated_this_month,
          };
        }
        return {
          allowed: true,
          limit: plan.max_quizzes_per_month,
          current: usage.quizzes_generated_this_month,
        };

      case "upload_pdf":
        const storageUsedGB = usage.total_storage_used_bytes / (1024 * 1024 * 1024);
        if (storageUsedGB >= plan.max_pdf_storage_gb) {
          return {
            allowed: false,
            reason: `You've reached your storage limit of ${plan.max_pdf_storage_gb}GB. Upgrade for more storage.`,
            limit: plan.max_pdf_storage_gb,
            current: Math.round(storageUsedGB * 100) / 100,
          };
        }
        return {
          allowed: true,
          limit: plan.max_pdf_storage_gb,
          current: Math.round(storageUsedGB * 100) / 100,
        };

      case "batch_quiz":
        if (!plan.has_advanced_ai) {
          return {
            allowed: false,
            reason: "Batch quiz generation is only available on Pro plan and above.",
          };
        }
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }

  /**
   * Track quiz generation
   */
  static async trackQuizGeneration(userId: string): Promise<void> {
    const { error } = await supabase.rpc("increment_quiz_count", {
      p_user_id: userId,
    });

    // If RPC doesn't exist, do it manually
    if (error) {
      const { error: updateError } = await supabase
        .from("usage_tracking")
        .update({
          quizzes_generated_this_month: supabase.raw("quizzes_generated_this_month + 1"),
          total_quizzes_generated: supabase.raw("total_quizzes_generated + 1"),
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;
    }
  }

  /**
   * Track PDF upload
   */
  static async trackPdfUpload(userId: string, fileSize: number): Promise<void> {
    const { error } = await supabase
      .from("usage_tracking")
      .update({
        pdfs_uploaded_this_month: supabase.raw("pdfs_uploaded_this_month + 1"),
        total_pdfs_uploaded: supabase.raw("total_pdfs_uploaded + 1"),
        total_storage_used_bytes: supabase.raw(`total_storage_used_bytes + ${fileSize}`),
      })
      .eq("user_id", userId);

    if (error) throw error;
  }

  /**
   * Check if user has access to a feature
   */
  static async hasFeatureAccess(
    userId: string,
    feature: keyof Pick<
      SubscriptionPlan,
      | "has_advanced_ai"
      | "has_auto_scheduling"
      | "has_auto_pdf_explanations"
      | "has_analytics_dashboard"
      | "has_leaderboards"
      | "has_custom_branding"
      | "has_multi_language"
      | "has_priority_support"
      | "has_api_access"
      | "has_white_label"
    >
  ): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription || !subscription.plan) {
      return false;
    }

    const plan = subscription.plan as unknown as SubscriptionPlan;
    return plan[feature] === true;
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId: string): Promise<void> {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
      })
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) throw error;
  }

  /**
   * Upgrade subscription
   */
  static async upgradeSubscription(
    userId: string,
    newPlanName: string
  ): Promise<UserSubscription> {
    // Check if user can purchase plans
    const purchaseCheck = await this.canPurchasePlans(userId);
    if (!purchaseCheck.allowed) {
      throw new Error(purchaseCheck.reason);
    }

    // Get the new plan
    const { data: newPlan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("name", newPlanName)
      .single();

    if (planError) throw planError;

    // Update existing subscription
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        plan_id: newPlan.id,
        cancel_at_period_end: false,
      })
      .eq("user_id", userId)
      .eq("status", "active")
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .single();

    if (error) throw error;

    return data;
  }
}
