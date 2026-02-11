-- 1. Update handle_new_user to use 'basic' plan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  -- 1. Create user profile
  -- We use COALESCE and ensure it doesn't fail
  INSERT INTO public.profiles (id, email, full_name, role, approval_status)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    'user',
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Get the default/free plan ID
  -- We check for 'basic' or 'free' or just the first plan if none found
  SELECT id INTO v_plan_id
  from public.subscription_plans
  where (name = 'basic' OR name = 'free') AND is_active = true
  ORDER BY price ASC
  limit 1;

  -- 3. Create subscription with the plan
  IF v_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      user_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end
    )
    VALUES (
      new.id,
      v_plan_id,
      'active',
      now(),
      now() + interval '100 years',
      false
    )
    ON CONFLICT (user_id) DO NOTHING;

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
      new.id,
      0,
      0,
      0,
      0,
      0,
      now(),
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;
