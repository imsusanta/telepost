import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  SubscriptionService,
  SubscriptionPlan,
  UserSubscription,
  PlanFeatures,
  DEFAULT_FREE_FEATURES,
  ALL_FEATURES_ENABLED,
} from '@/services/subscriptionService';
import { isSuperAdmin } from '@/services/couponService';

// Feature key types for the canAccess API 
type TopLevelFeature = keyof PlanFeatures;
type CreateQuizSubFeature = 'ai_generated' | 'manual_input' | 'question_bank' | 'documents';
type CreatePostSubFeature = 'write_with_ai';
type QuestionBankSubFeature = 'my_questions' | 'ai_generate' | 'pdf_generate';

type SubFeatureMap = {
  create_quiz: CreateQuizSubFeature;
  create_post: CreatePostSubFeature;
  question_bank: QuestionBankSubFeature;
  channels: never;
  stories: never;
  knowledge_base: never;
  scheduler: never;
};

interface UseSubscriptionReturn {
  plan: SubscriptionPlan | null;
  planName: string;
  subscription: UserSubscription | null;
  loading: boolean;
  isSuperAdmin: boolean;
  features: PlanFeatures;
  canAccess: <T extends TopLevelFeature>(
    feature: T,
    subFeature?: SubFeatureMap[T]
  ) => boolean;
  getLimit: (key: 'max_telegram_channels' | 'max_question_bank_size' | 'max_pdf_storage_gb' | 'max_quizzes_per_month' | 'max_batch_quiz_generation' | 'max_questions_per_quiz' | 'max_kb_docs') => number | null;
}

// Cache to avoid repeated DB calls within the same session
let cachedPlan: SubscriptionPlan | null = null;
let cachedSubscription: UserSubscription | null = null;
let cachedSuperAdmin: boolean | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60_000; // 1 minute

/**
 * Merges stored features with defaults to ensure all keys exist.
 * This prevents crashes when new features are added but old plans haven't been updated.
 */
function mergeFeatures(stored: Partial<PlanFeatures> | undefined | null): PlanFeatures {
  if (!stored) return { ...DEFAULT_FREE_FEATURES };

  const merged: PlanFeatures = { ...DEFAULT_FREE_FEATURES };

  // Simple boolean features
  if (typeof stored.channels === 'boolean') merged.channels = stored.channels;
  if (typeof stored.stories === 'boolean') merged.stories = stored.stories;
  if (typeof stored.knowledge_base === 'boolean') merged.knowledge_base = stored.knowledge_base;
  if (typeof stored.scheduler === 'boolean') merged.scheduler = stored.scheduler;

  // Complex features with sub-features
  if (stored.create_quiz && typeof stored.create_quiz === 'object') {
    merged.create_quiz = { ...DEFAULT_FREE_FEATURES.create_quiz, ...stored.create_quiz };
  }
  if (stored.create_post && typeof stored.create_post === 'object') {
    merged.create_post = { ...DEFAULT_FREE_FEATURES.create_post, ...stored.create_post };
  }
  if (stored.question_bank && typeof stored.question_bank === 'object') {
    merged.question_bank = { ...DEFAULT_FREE_FEATURES.question_bank, ...stored.question_bank };
  }

  return merged;
}

export function useSubscription(): UseSubscriptionReturn {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(cachedPlan);
  const [subscription, setSubscription] = useState<UserSubscription | null>(cachedSubscription);
  const [loading, setLoading] = useState(!cachedPlan || Date.now() - cacheTimestamp > CACHE_TTL);
  const [superAdmin, setSuperAdmin] = useState(cachedSuperAdmin ?? false);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Check super admin
        const adminStatus = await isSuperAdmin();
        setSuperAdmin(adminStatus);
        cachedSuperAdmin = adminStatus;

        // Get subscription
        const sub = await SubscriptionService.getUserSubscription(user.id);
        setSubscription(sub);
        cachedSubscription = sub;

        if (sub?.plan && typeof sub.plan === 'object') {
          const planData = sub.plan as unknown as SubscriptionPlan;
          // Ensure features are merged with defaults
          planData.features = mergeFeatures(planData.features);
          setPlan(planData);
          cachedPlan = planData;
        } else {
          // No subscription = free tier defaults
          const freePlan: SubscriptionPlan = {
            id: 'free-default',
            name: 'free',
            display_name: 'Free Trial',
            price: 0,
            yearly_price: 0,
            billing_period: 'trial',
            max_telegram_channels: 1,
            max_pdf_storage_gb: 0,
            max_quizzes_per_month: null,
            max_batch_quiz_generation: 1,
            max_question_bank_size: 500,
            max_questions_per_quiz: 0,
            max_kb_docs: 0,
            features: { ...DEFAULT_FREE_FEATURES },
          };
          setPlan(freePlan);
          cachedPlan = freePlan;
        }

        cacheTimestamp = Date.now();
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    // Use cache if fresh
    if (cachedPlan && Date.now() - cacheTimestamp < CACHE_TTL) {
      setPlan(cachedPlan);
      setSubscription(cachedSubscription);
      setSuperAdmin(cachedSuperAdmin ?? false);
      setLoading(false);
      return;
    }

    loadSubscription();
  }, []);

  // Resolve the active features — super admin gets everything
  const features: PlanFeatures = superAdmin
    ? ALL_FEATURES_ENABLED
    : (plan?.features ?? DEFAULT_FREE_FEATURES);

  /**
   * Check if a feature (or sub-feature) is accessible.
   * 
   * Usage:
   *   canAccess('channels')                        // simple boolean feature
   *   canAccess('create_quiz')                     // parent feature enabled check
   *   canAccess('create_quiz', 'ai_generated')     // sub-feature check (also checks parent)
   */
  const canAccess = <T extends TopLevelFeature>(
    feature: T,
    subFeature?: SubFeatureMap[T]
  ): boolean => {
    if (superAdmin) return true;
    if (!plan) return false;

    const featureValue = features[feature];

    // Simple boolean feature (channels, stories, knowledge_base, scheduler)
    if (typeof featureValue === 'boolean') {
      return featureValue;
    }

    // Complex feature with sub-features
    if (typeof featureValue === 'object' && featureValue !== null) {
      // Parent must be enabled
      if (!(featureValue as any).enabled) return false;
      
      // If no sub-feature specified, just check parent
      if (!subFeature) return true;
      
      // Check sub-feature
      return (featureValue as any)[subFeature] === true;
    }

    return false;
  };

  const getLimit = (key: 'max_telegram_channels' | 'max_question_bank_size' | 'max_pdf_storage_gb' | 'max_quizzes_per_month' | 'max_batch_quiz_generation' | 'max_questions_per_quiz' | 'max_kb_docs'): number | null => {
    if (superAdmin) return null; // No limits for super admin
    if (!plan) return 0;
    return (plan as any)[key] ?? 0;
  };

  return {
    plan,
    planName: superAdmin ? 'super_admin' : (plan?.name ?? 'free'),
    subscription,
    loading,
    isSuperAdmin: superAdmin,
    features,
    canAccess,
    getLimit,
  };
}
