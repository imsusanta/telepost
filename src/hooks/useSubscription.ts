import { useState, useEffect, useMemo, useCallback } from 'react';
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

const CACHE_KEY = 'telepost_subscription_cache';

// Free tier constants
const FREE_PLAN: SubscriptionPlan = {
  id: 'free-default',
  name: 'free',
  display_name: 'Free Trial',
  price: 0,
  yearly_price: 0,
  billing_period: 'trial',
  max_telegram_channels: 1,
  max_pdf_storage_gb: 1,
  max_quizzes_per_month: 5,
  max_batch_quiz_generation: 1,
  max_question_bank_size: 500,
  max_questions_per_quiz: 10,
  max_kb_docs: 5,
  features: { ...DEFAULT_FREE_FEATURES },
};

/**
 * Merges stored features with defaults to ensure all keys exist.
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
    merged.create_quiz = { 
      ...DEFAULT_FREE_FEATURES.create_quiz, 
      ...stored.create_quiz,
      enabled: true, // Force enabled true if it exists in stored
    };
  }
  if (stored.create_post && typeof stored.create_post === 'object') {
    merged.create_post = { 
      ...DEFAULT_FREE_FEATURES.create_post, 
      ...stored.create_post,
      enabled: true,
    };
  }
  if (stored.question_bank && typeof stored.question_bank === 'object') {
    merged.question_bank = { 
      ...DEFAULT_FREE_FEATURES.question_bank, 
      ...stored.question_bank,
      enabled: true,
    };
  }

  return merged;
}

export function useSubscription(): UseSubscriptionReturn {
  // Try to load from localStorage first for zero-latency UI on refresh
  const getInitialState = () => {
    if (typeof window === 'undefined') return { plan: FREE_PLAN, sub: null, admin: false };
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Date.now() - parsed.timestamp < 1000 * 60 * 30) { // 30 min cache
          return { plan: parsed.plan, sub: parsed.sub, admin: parsed.admin };
        }
      }
    } catch (e) {}
    return { plan: FREE_PLAN, sub: null, admin: false };
  };

  const initialState = useMemo(getInitialState, []);
  
  const [plan, setPlan] = useState<SubscriptionPlan | null>(() => {
    if (initialState.plan) {
      const p = { ...initialState.plan };
      p.features = mergeFeatures(p.features);
      return p;
    }
    return FREE_PLAN;
  });
  const [subscription, setSubscription] = useState<UserSubscription | null>(initialState.sub);
  const [superAdmin, setSuperAdmin] = useState(initialState.admin);
  const [loading, setLoading] = useState(true);

  // ... (useEffect remains similar but let's ensure it also merges)
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const [adminStatus, sub] = await Promise.all([
          isSuperAdmin(),
          SubscriptionService.getUserSubscription(user.id)
        ]);

        let activePlan = { ...FREE_PLAN };
        if (sub?.plan && typeof sub.plan === 'object') {
          activePlan = { ...(sub.plan as unknown as SubscriptionPlan) };
          activePlan.features = mergeFeatures(activePlan.features);
        } else {
          activePlan.features = mergeFeatures(activePlan.features);
        }

        setSuperAdmin(adminStatus);
        setSubscription(sub);
        setPlan(activePlan);

        localStorage.setItem(CACHE_KEY, JSON.stringify({
          plan: activePlan,
          sub,
          admin: adminStatus,
          timestamp: Date.now()
        }));

      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, []);

  const features: PlanFeatures = useMemo(() => {
    return superAdmin ? ALL_FEATURES_ENABLED : (plan?.features ?? DEFAULT_FREE_FEATURES);
  }, [superAdmin, plan]);

  const canAccess = useCallback(<T extends TopLevelFeature>(
    feature: T,
    subFeature?: SubFeatureMap[T]
  ): boolean => {
    if (superAdmin) return true;
    
    const featureValue = features[feature];

    if (typeof featureValue === 'boolean') {
      return featureValue;
    }

    if (typeof featureValue === 'object' && featureValue !== null) {
      if (!(featureValue as any).enabled) return false;
      if (!subFeature) return true;
      return (featureValue as any)[subFeature] === true;
    }

    return false;
  }, [superAdmin, features]);

  const getLimit = useCallback((key: 'max_telegram_channels' | 'max_question_bank_size' | 'max_pdf_storage_gb' | 'max_quizzes_per_month' | 'max_batch_quiz_generation' | 'max_questions_per_quiz' | 'max_kb_docs'): number | null => {
    if (superAdmin) return null;
    if (!plan) return 0;
    return (plan as any)[key] ?? 0;
  }, [superAdmin, plan]);

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
