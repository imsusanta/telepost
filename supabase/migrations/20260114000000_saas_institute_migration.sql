-- Add institute_name to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institute_name TEXT;

-- Update handle_new_user to capture institute_name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  -- 1. Create user profile with institute_name
  INSERT INTO public.profiles (id, email, full_name, institute_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'institute_name'
  );

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
