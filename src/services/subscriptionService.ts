import { supabase } from "@/integrations/supabase/client";

// Feature toggle interfaces
export interface CreateQuizFeatures {
  enabled: boolean;
  ai_generated: boolean;
  manual_input: boolean;
  question_bank: boolean;
  documents: boolean;
}

export interface CreatePostFeatures {
  enabled: boolean;
  write_with_ai: boolean;
}

export interface QuestionBankFeatures {
  enabled: boolean;
  my_questions: boolean;
  ai_generate: boolean;
  pdf_generate: boolean;
}

export interface PlanFeatures {
  create_quiz: CreateQuizFeatures;
  create_post: CreatePostFeatures;
  channels: boolean;
  stories: boolean;
  question_bank: QuestionBankFeatures;
  knowledge_base: boolean;
  scheduler: boolean;
}

export const DEFAULT_FREE_FEATURES: PlanFeatures = {
  create_quiz: {
    enabled: true,
    ai_generated: false,
    manual_input: true,
    question_bank: true,
    documents: false,
  },
  create_post: {
    enabled: true,
    write_with_ai: false,
  },
  channels: true,
  stories: true,
  question_bank: {
    enabled: true,
    my_questions: true,
    ai_generate: false,
    pdf_generate: false,
  },
  knowledge_base: false,
  scheduler: false,
};

export const ALL_FEATURES_ENABLED: PlanFeatures = {
  create_quiz: {
    enabled: true,
    ai_generated: true,
    manual_input: true,
    question_bank: true,
    documents: true,
  },
  create_post: {
    enabled: true,
    write_with_ai: true,
  },
  channels: true,
  stories: true,
  question_bank: {
    enabled: true,
    my_questions: true,
    ai_generate: true,
    pdf_generate: true,
  },
  knowledge_base: true,
  scheduler: true,
};

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  price: number;
  yearly_price: number;
  billing_period: string;

  // Limits
  max_telegram_channels: number;
  max_pdf_storage_gb: number;
  max_quizzes_per_month: number | null;
  max_batch_quiz_generation: number;
  max_question_bank_size: number;
  max_questions_per_quiz: number;
  max_kb_docs: number;

  // Structured feature toggles
  features: PlanFeatures;

  // Legacy fields (kept for backward compat, not actively used)
  has_advanced_ai?: boolean;
  has_auto_scheduling?: boolean;
  has_auto_pdf_explanations?: boolean;
  has_analytics_dashboard?: boolean;
  has_custom_branding?: boolean;
  has_multi_language?: boolean;
  has_api_access?: boolean;
  has_white_label?: boolean;
  has_story?: boolean;
  has_ai_writing?: boolean;
  has_write_with_ai?: boolean;
  has_documents_access?: boolean;
  has_ai_quiz?: boolean;
  has_pdf_quiz?: boolean;
  has_ai_post_gen?: boolean;
  quiz_manual_only?: boolean;
  question_bank_private_only?: boolean;
  has_kb_access?: boolean;
  kb_view_only?: boolean;
  has_manual_input?: boolean;
}


export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean | null;
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
    return (data || []) as unknown as SubscriptionPlan[];
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

    return data as unknown as UserSubscription;
  }

  /**
   * Check if user can purchase plans
   */
  static async canPurchasePlans(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("can_purchase_plans")
      .eq("id", userId)
      .single();

    if (error) {
      return {
        allowed: false,
        reason: "Failed to verify purchase permissions"
      };
    }

    const canPurchase = (profile as { can_purchase_plans?: boolean }).can_purchase_plans;
    if (canPurchase === false || canPurchase === undefined || canPurchase === null) {
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
    planName: string,
    couponCode?: string
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
    if (!plan || typeof (plan as { price?: number }).price !== 'number') {
      throw new Error('Invalid plan data');
    }

    // Handle coupon if provided
    let couponId: string | null = null;
    let discountAmount: number = 0;
    const originalPrice: number = (plan as { price: number }).price;
    let finalPrice: number = (plan as { price: number }).price;

    if (couponCode) {
      const { data: validationResult, error: couponError } = await supabase
        .rpc('validate_coupon', {
          p_coupon_code: couponCode,
          p_user_id: userId,
          p_plan_name: planName,
          p_purchase_amount: originalPrice,
        });

      if (couponError) {
        throw new Error(`Coupon validation failed: ${couponError.message}`);
      }

      const validation = validationResult && validationResult.length > 0 ? validationResult[0] : null;

      if (validation && !validation.is_valid) {
        throw new Error(validation.error_message || 'Invalid coupon code');
      }

      if (validation && validation.is_valid) {
        couponId = validation.coupon_id;
        discountAmount = validation.discount_amount || 0;
        finalPrice = validation.final_amount || (plan as { price: number }).price;
      }
    }

    // Create subscription
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    
    if (plan.billing_period === 'yearly') {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else if (plan.billing_period === 'trial') {
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 7);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: plan.id,
        status: "active",
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        coupon_id: couponId,
        discount_amount: discountAmount,
        original_price: originalPrice,
      })
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .single();

    if (error) throw error;

    // Apply coupon if used
    if (couponCode && couponId) {
      await supabase.rpc('apply_coupon', {
        p_coupon_code: couponCode,
        p_user_id: userId,
        p_subscription_id: data.id,
        p_discount_amount: discountAmount,
        p_original_amount: originalPrice,
        p_final_amount: finalPrice,
      });
    }

    // Initialize usage tracking
    await this.initializeUsageTracking(userId);

    return data as unknown as UserSubscription;
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

    // If no subscription found, allow with generous default limits (free tier)
    if (!subscription || !subscription.plan) {
      const usage = await this.getUserUsage(userId);

      // Default free tier limits
      const defaultLimits = {
        max_quizzes_per_month: null, // Unlimited for development/testing
        max_pdf_storage_gb: 50,
        max_batch_quiz_generation: 1,
        has_advanced_ai: true, // Enable all features for testing
      };

      switch (action) {
        case "generate_quiz":
          return { allowed: true }; // Unlimited quizzes for free tier

        case "upload_pdf": {
          const storageUsedGB = usage.total_storage_used_bytes / (1024 * 1024 * 1024);
          if (storageUsedGB >= defaultLimits.max_pdf_storage_gb) {
            return {
              allowed: false,
              reason: `You've reached your storage limit of ${defaultLimits.max_pdf_storage_gb}GB. Upgrade for more storage.`,
              limit: defaultLimits.max_pdf_storage_gb,
              current: Math.round(storageUsedGB * 100) / 100,
            };
          }
          return {
            allowed: true,
            limit: defaultLimits.max_pdf_storage_gb,
            current: Math.round(storageUsedGB * 100) / 100,
          };
        }

        case "batch_quiz":
          return { allowed: true }; // Allow batch quiz generation

        default:
          return { allowed: true };
      }
    }

    const usage = await this.getUserUsage(userId);
    if (!subscription.plan || typeof subscription.plan !== 'object') {
      return { allowed: false, reason: 'Invalid subscription plan data' };
    }
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

      case "upload_pdf": {
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
      }

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

    // If RPC doesn't exist or fails, do it manually
    if (error) {
      console.warn("increment_quiz_count RPC failed, using manual update:", error);

      // Get current usage
      const { data: currentUsage } = await supabase
        .from("usage_tracking")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (currentUsage) {
        // Update with incremented values
        const { error: updateError } = await supabase
          .from("usage_tracking")
          .update({
            quizzes_generated_this_month: ((currentUsage as { quizzes_generated_this_month: number }).quizzes_generated_this_month || 0) + 1,
            total_quizzes_generated: ((currentUsage as { total_quizzes_generated: number }).total_quizzes_generated || 0) + 1,
          })
          .eq("user_id", userId);

        if (updateError) throw updateError;
      } else {
        // Initialize usage tracking if it doesn't exist
        await this.initializeUsageTracking(userId);
        // Recursive call after initialization
        const { data: newUsage } = await supabase
          .from("usage_tracking")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (newUsage) {
          await supabase
            .from("usage_tracking")
            .update({
              quizzes_generated_this_month: ((newUsage as { quizzes_generated_this_month: number }).quizzes_generated_this_month || 0) + 1,
              total_quizzes_generated: ((newUsage as { total_quizzes_generated: number }).total_quizzes_generated || 0) + 1,
            })
            .eq("user_id", userId);
        }
      }
    }
  }

  /**
   * Track PDF upload
   */
  static async trackPdfUpload(userId: string, fileSize: number): Promise<void> {
    // Get current usage first
    const { data: currentUsage } = await supabase
      .from("usage_tracking")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!currentUsage) {
      // Initialize usage tracking if it doesn't exist
      await this.initializeUsageTracking(userId);
      // Try again
      return this.trackPdfUpload(userId, fileSize);
    }

    // Update with incremented values
    const { error } = await supabase
      .from("usage_tracking")
      .update({
        pdfs_uploaded_this_month: ((currentUsage as { pdfs_uploaded_this_month: number }).pdfs_uploaded_this_month || 0) + 1,
        total_pdfs_uploaded: ((currentUsage as { total_pdfs_uploaded: number }).total_pdfs_uploaded || 0) + 1,
        total_storage_used_bytes: ((currentUsage as { total_storage_used_bytes: number }).total_storage_used_bytes || 0) + fileSize,
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
      | "has_custom_branding"
      | "has_multi_language"
      | "has_api_access"
      | "has_white_label"
      | "has_story"
      | "has_ai_writing"
      | "has_documents_access"
      | "quiz_manual_only"
      | "question_bank_private_only"
    >
  ): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);

    // If no subscription found, use free tier defaults
    if (!subscription || !subscription.plan) {
      const freeDefaults: Record<string, boolean> = {
        has_advanced_ai: false,
        has_auto_scheduling: false,
        has_auto_pdf_explanations: false,
        has_analytics_dashboard: false,
        has_custom_branding: false,
        has_multi_language: false,
        has_api_access: false,
        has_white_label: false,
        has_story: true,
        has_ai_writing: false,
        has_documents_access: false,
        quiz_manual_only: true,
        question_bank_private_only: true,
      };
      return freeDefaults[feature] ?? false;
    }

    if (typeof subscription.plan !== 'object') {
      return false; // Invalid plan data
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

    return data as unknown as UserSubscription;
  }
}
