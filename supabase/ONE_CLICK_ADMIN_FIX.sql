-- =============================================
-- ONE-CLICK ADMIN & SIGN-UP FIX
-- =============================================

-- 1. FIX SYSTEM SETTINGS (FAIL-SAFE)
-- We check for the column names before inserting
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'setting_key') THEN
        INSERT INTO public.system_settings (setting_key, setting_value)
        VALUES ('ai_settings', '{"provider": "lovable", "model": "openai/gpt-4o-mini"}')
        ON CONFLICT (setting_key) DO NOTHING;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'key') THEN
        INSERT INTO public.system_settings (key, value)
        VALUES ('ai_settings', '{"provider": "lovable", "model": "openai/gpt-4o-mini"}')
        ON CONFLICT (key) DO NOTHING;
    END IF;
END $$;

-- 2. REPAIR GHOST PROFILES (DIRECT LINKING)
-- This connects your Auth accounts directly to the Database profiles
DO $$
DECLARE
    u RECORD;
    v_plan_id uuid;
BEGIN
    -- Get default plan (basic/starter)
    SELECT id INTO v_plan_id FROM public.subscription_plans WHERE is_active = true ORDER BY (name = 'basic') DESC, price ASC LIMIT 1;

    FOR u IN (SELECT id, email, raw_user_meta_data FROM auth.users WHERE email IN ('susantalohr@gmail.com', 'susanta@sushantadigital.in')) LOOP
        -- Create/Update Profile
        INSERT INTO public.profiles (id, email, full_name, role, approval_status)
        VALUES (
            u.id, 
            u.email, 
            COALESCE(u.raw_user_meta_data->>'full_name', 'User'),
            CASE WHEN u.email = 'susantalohr@gmail.com' THEN 'super_admin' ELSE 'user' END,
            'approved'
        )
        ON CONFLICT (id) DO UPDATE SET 
            email = EXCLUDED.email,
            role = CASE WHEN EXCLUDED.email = 'susantalohr@gmail.com' THEN 'super_admin' ELSE EXCLUDED.role END;

        -- Create Subscription if missing
        IF v_plan_id IS NOT NULL THEN
            INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
            VALUES (u.id, v_plan_id, 'active', now(), now() + interval '100 years') ON CONFLICT (user_id) DO NOTHING;
            
            INSERT INTO public.usage_tracking (user_id) VALUES (u.id) ON CONFLICT (user_id) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- 3. FIX REGISTRATION TRIGGER FOR FUTURE USERS
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
    BEGIN
        INSERT INTO public.usage_tracking (user_id) VALUES (new.id) ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. FIX RLS RECURSION (BULLETPROOF)
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'super_admin' OR role = 'admin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_super_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_super_admin());
CREATE POLICY "Anyone can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. FINAL CONFIRMATION
DO $$ BEGIN RAISE NOTICE 'SUCCESS: Profiles fixed, roles assigned, and trigger updated.'; END $$;
