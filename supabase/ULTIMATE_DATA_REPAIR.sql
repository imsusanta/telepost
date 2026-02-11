-- =============================================
-- ULTIMATE DATA REPAIR (FINAL VERSION)
-- =============================================

-- BLOCK 1: ENSURE PROFILES TABLE & CORE COLUMNS
DO $$ 
BEGIN
    CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id),
        email TEXT,
        full_name TEXT,
        role TEXT DEFAULT 'user',
        approval_status TEXT DEFAULT 'approved',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
    RAISE NOTICE 'Profiles table verified.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notice: %', SQLERRM;
END $$;

-- BLOCK 2: SECURITY FUNCTIONS (SUPPORTING FRONTEND)
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

-- BLOCK 3: SYNC ALL USERS & ROLES
DO $$ 
DECLARE
    u RECORD;
BEGIN
    FOR u IN (SELECT id, email, raw_user_meta_data FROM auth.users) LOOP
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
                ELSE profiles.role 
            END,
            approval_status = 'approved';
        
        RAISE NOTICE 'Profile and Role synced: %', u.email;
    END LOOP;
END $$;

-- BLOCK 4: SYNC BILLING (SUBSCRIPTIONS & USAGE TRACKING)
DO $$ 
DECLARE
    u RECORD;
    v_plan_id UUID;
BEGIN
    -- Get the basic plan ID (fallback to any active plan)
    SELECT id INTO v_plan_id FROM public.subscription_plans WHERE is_active = true ORDER BY (name = 'basic') DESC, price ASC LIMIT 1;
    
    IF v_plan_id IS NOT NULL THEN
        FOR u IN (SELECT id, email FROM public.profiles) LOOP
            -- Create Subscription if missing
            INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
            VALUES (u.id, v_plan_id, 'active', now(), now() + interval '100 years')
            ON CONFLICT (user_id) DO NOTHING;
            
            -- Create Usage Tracking if missing
            INSERT INTO public.usage_tracking (user_id)
            VALUES (u.id)
            ON CONFLICT (user_id) DO NOTHING;
            
            RAISE NOTICE 'Billing synced for %', u.email;
        END LOOP;
    ELSE
        RAISE NOTICE 'EXCEPTION: No active subscription plans found. Please seed subscription_plans first.';
    END IF;
END $$;

-- BLOCK 5: FIX REGISTRATION TRIGGER
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

-- BLOCK 6: RESET RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can select" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update" ON public.profiles;

CREATE POLICY "Anyone can select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Anyone can update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_super_admin(auth.uid()));

-- FINAL STATUS RECHECK
DO $$ 
BEGIN 
    RAISE NOTICE '--- FINAL REPORT ---';
    RAISE NOTICE 'Total Profiles: %', (SELECT count(*) FROM public.profiles);
    RAISE NOTICE 'Total Subscriptions: %', (SELECT count(*) FROM public.subscriptions);
    RAISE NOTICE 'Admin Status (%): %', 'susantalohr@gmail.com', (SELECT role FROM public.profiles WHERE email = 'susantalohr@gmail.com');
    RAISE NOTICE 'Admin Status (%): %', 'susanta@sushantadigital.in', (SELECT role FROM public.profiles WHERE email = 'susanta@sushantadigital.in');
END $$;
