-- Make the Free Trial plan a seven-day trial for every new signup.

UPDATE public.subscription_plans
SET
  display_name = 'Free Trial',
  price = 0,
  billing_period = 'trial',
  is_active = true
WHERE name = 'free';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  SELECT id INTO v_free_plan_id
  FROM public.subscription_plans
  WHERE name = 'free' AND is_active = true
  LIMIT 1;

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
      now() + INTERVAL '7 days',
      false
    );

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
    VALUES (NEW.id, 0, 0, 0, 0, 0, now(), now());
  END IF;

  RETURN NEW;
END;
$$;
