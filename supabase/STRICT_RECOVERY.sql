-- =============================================
-- STRICT DATA RECOVERY (ONE-BY-ONE BLOCKS)
-- =============================================

-- STEP 1: FIX FUNCTIONS (ALWAYS NEEDED)
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid DEFAULT auth.uid()) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id AND (role = 'super_admin' OR role = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT auth.uid()) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id AND (role = 'admin' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 2: SYNC PROFILES AND ROLES
DO $$ 
DECLARE
    u RECORD;
BEGIN
    FOR u IN (SELECT id, email, raw_user_meta_data FROM auth.users) LOOP
        BEGIN
            INSERT INTO public.profiles (id, email, full_name, role, approval_status)
            VALUES (
                u.id, 
                u.email, 
                COALESCE(u.raw_user_meta_data->>'full_name', 'User'),
                CASE 
                    WHEN u.email IN ('susantalohr@gmail.com', 'susanta@sushantadigital.in') THEN 'super_admin' 
                    ELSE 'user' 
                END,
                'approved'
            )
            ON CONFLICT (id) DO UPDATE SET 
                email = EXCLUDED.email,
                role = CASE 
                    WHEN EXCLUDED.email IN ('susantalohr@gmail.com', 'susanta@sushantadigital.in') THEN 'super_admin' 
                    ELSE public.profiles.role 
                END,
                approval_status = 'approved';
            RAISE NOTICE 'SUCCESS: Synced profile for %', u.email;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'SKIPPED: Could not sync profile for %: %', u.email, SQLERRM;
        END;
    END LOOP;
END $$;

-- STEP 3: SYNC BILLING (SUBSCRIPTIONS)
DO $$ 
DECLARE
    u RECORD;
    v_plan_id UUID;
BEGIN
    -- Get the basic plan ID
    SELECT id INTO v_plan_id FROM public.subscription_plans WHERE is_active = true ORDER BY (name = 'basic') DESC, price ASC LIMIT 1;
    
    IF v_plan_id IS NOT NULL THEN
        FOR u IN (SELECT id FROM public.profiles) LOOP
            BEGIN
                INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
                VALUES (u.id, v_plan_id, 'active', now(), now() + interval '100 years')
                ON CONFLICT (user_id) DO NOTHING;
                
                INSERT INTO public.usage_tracking (user_id)
                VALUES (u.id)
                ON CONFLICT (user_id) DO NOTHING;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'SKIPPED: Billing sync for %: %', u.id, SQLERRM;
            END;
        END LOOP;
        RAISE NOTICE 'SUCCESS: Billing sync completed.';
    ELSE
        RAISE NOTICE 'ERROR: No active plans found in subscription_plans.';
    END IF;
END $$;

-- STEP 4: FIX TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, approval_status)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'User'), 'user', 'approved')
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO v_plan_id FROM public.subscription_plans WHERE is_active = true ORDER BY (name = 'basic') DESC, price ASC LIMIT 1;
  IF v_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
    VALUES (new.id, v_plan_id, 'active', now(), now() + interval '100 years') ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.usage_tracking (user_id) VALUES (new.id) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- STEP 5: FINAL REPORT
DO $$ 
BEGIN 
    RAISE NOTICE '--- FINAL REPORT ---';
    RAISE NOTICE 'Profiles count: %', (SELECT count(*) FROM public.profiles);
    RAISE NOTICE 'Subscriptions count: %', (SELECT count(*) FROM public.subscriptions);
    RAISE NOTICE 'Admin: %', (SELECT email || ' (' || role || ')' FROM public.profiles WHERE email = 'susantalohr@gmail.com');
END $$;
