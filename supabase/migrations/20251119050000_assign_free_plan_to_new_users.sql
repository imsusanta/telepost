-- ============================================
-- ASSIGN FREE PLAN TO NEW USERS AUTOMATICALLY
-- ============================================

-- This migration updates the handle_new_user() function to:
-- 1. Create a user profile
-- 2. Assign the free plan to new users
-- 3. Initialize usage tracking

-- Drop existing function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create updated function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  -- 1. Create user profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  -- 2. Get the free plan ID
  SELECT id INTO v_free_plan_id
  FROM public.subscription_plans
  WHERE name = 'free' AND is_active = true
  LIMIT 1;

  -- 3. Create subscription with free plan (if free plan exists)
  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      user_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end
    )
    VALUES (
      NEW.id,
      v_free_plan_id,
      'active',
      now(),
      now() + INTERVAL '100 years', -- Free plan never expires
      false
    );

    -- 4. Initialize usage tracking
    INSERT INTO public.usage_tracking (
      user_id,
      quizzes_generated_this_month,
      pdfs_uploaded_this_month,
      total_quizzes_generated,
      total_pdfs_uploaded,
      total_storage_used_bytes,
      current_period_start,
      last_reset_at
    )
    VALUES (
      NEW.id,
      0,
      0,
      0,
      0,
      0,
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
