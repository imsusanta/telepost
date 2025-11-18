-- =============================================
-- SETUP SUPER ADMIN AND PRO PLAN FOR SUSANTALOHR@GMAIL.COM
-- =============================================
-- This migration sets up the initial super admin user with Pro plan

-- Note: This migration uses a DO block to handle the case where the user might not exist yet
-- If the user doesn't exist, they will be granted super admin and pro plan upon first login

DO $$
DECLARE
  target_user_id UUID;
  pro_plan_id UUID;
BEGIN
  -- Get the Pro plan ID
  SELECT id INTO pro_plan_id
  FROM public.subscription_plans
  WHERE name = 'pro'
  LIMIT 1;

  IF pro_plan_id IS NULL THEN
    RAISE EXCEPTION 'Pro plan not found. Please ensure premium_features_schema migration has run.';
  END IF;

  -- Try to find the user by email in auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'susantalohr@gmail.com'
  LIMIT 1;

  -- If user exists, update their profile and subscription
  IF target_user_id IS NOT NULL THEN
    -- Ensure profile exists
    INSERT INTO public.profiles (id, email, role, can_purchase_plans)
    VALUES (target_user_id, 'susantalohr@gmail.com', 'super_admin', true)
    ON CONFLICT (id) DO UPDATE
    SET
      role = 'super_admin',
      can_purchase_plans = true,
      updated_at = now();

    -- Create or update subscription to Pro plan
    INSERT INTO public.subscriptions (
      user_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end
    )
    VALUES (
      target_user_id,
      pro_plan_id,
      'active',
      now(),
      now() + INTERVAL '1 year', -- 1 year subscription
      false
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      plan_id = pro_plan_id,
      status = 'active',
      current_period_start = now(),
      current_period_end = now() + INTERVAL '1 year',
      cancel_at_period_end = false,
      updated_at = now();

    -- Initialize usage tracking
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
      target_user_id,
      0,
      0,
      0,
      0,
      0,
      now(),
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Successfully set up super admin and Pro plan for susantalohr@gmail.com (User ID: %)', target_user_id;
  ELSE
    -- User doesn't exist yet, create a function to auto-setup when they sign up
    RAISE NOTICE 'User susantalohr@gmail.com not found. Will be set up automatically upon first login.';
  END IF;
END $$;

-- =============================================
-- TRIGGER TO AUTO-SETUP SUPER ADMIN ON SIGNUP
-- =============================================

-- Function to auto-setup specific users with super admin and pro plan
CREATE OR REPLACE FUNCTION auto_setup_super_admin()
RETURNS TRIGGER AS $$
DECLARE
  pro_plan_id UUID;
BEGIN
  -- Check if this is the designated super admin email
  IF NEW.email = 'susantalohr@gmail.com' THEN
    -- Get Pro plan ID
    SELECT id INTO pro_plan_id
    FROM public.subscription_plans
    WHERE name = 'pro'
    LIMIT 1;

    IF pro_plan_id IS NOT NULL THEN
      -- Update profile to super admin
      UPDATE public.profiles
      SET
        role = 'super_admin',
        can_purchase_plans = true
      WHERE id = NEW.id;

      -- Create Pro subscription
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
        pro_plan_id,
        'active',
        now(),
        now() + INTERVAL '1 year',
        false
      )
      ON CONFLICT (user_id) DO NOTHING;

      -- Initialize usage tracking
      INSERT INTO public.usage_tracking (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;

      RAISE NOTICE 'Auto-setup completed for super admin: %', NEW.email;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table to auto-setup on insert
DROP TRIGGER IF EXISTS trigger_auto_setup_super_admin ON public.profiles;
CREATE TRIGGER trigger_auto_setup_super_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_setup_super_admin();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION auto_setup_super_admin IS 'Automatically sets up super admin role and Pro plan for designated users on signup';
COMMENT ON TRIGGER trigger_auto_setup_super_admin ON public.profiles IS 'Triggers auto-setup for designated super admin users';
