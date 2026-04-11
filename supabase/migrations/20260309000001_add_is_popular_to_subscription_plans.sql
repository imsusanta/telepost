-- Migration: Add is_popular column to subscription_plans
-- Date: 2026-03-09

ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS is_popular BOOLEAN NOT NULL DEFAULT false;

-- Mark 'pro' as popular by default as requested
UPDATE public.subscription_plans 
SET is_popular = true 
WHERE name = 'pro';
