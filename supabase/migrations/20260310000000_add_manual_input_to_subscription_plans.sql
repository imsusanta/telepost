-- Migration: Add has_manual_input to subscription_plans
-- Date: 2026-03-10

ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS has_manual_input BOOLEAN NOT NULL DEFAULT true;

-- Update existing plans to have manual input enabled by default
UPDATE public.subscription_plans 
SET has_manual_input = true;
