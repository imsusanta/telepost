-- Migration: Remove Email Verification Requirement
-- This migration updates the profiles table to:
-- 1. Set email_verified default to true for new users
-- 2. Update all existing users to be verified

-- Update existing users to be verified
UPDATE public.profiles
SET email_verified = true
WHERE email_verified = false OR email_verified IS NULL;

-- Change the default value to true for new users
ALTER TABLE public.profiles
ALTER COLUMN email_verified SET DEFAULT true;

-- Add comment to document the change
COMMENT ON COLUMN public.profiles.email_verified IS 'Email verification removed - all users are verified by default';
