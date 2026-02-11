-- =============================================
-- ULTIMATE FIX SCRIPT (CORRECTED SCHEMA)
-- =============================================

-- PART 1: FIX PROFILES TABLE
DO $$ 
BEGIN
    ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';
    ALTER TABLE public.profiles ALTER COLUMN approval_status SET DEFAULT 'approved';
    ALTER TABLE public.profiles ALTER COLUMN telegram_bot_token DROP NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN telegram_channel_id DROP NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;
END $$;

-- PART 2: SECURITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'super_admin' OR role = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PART 3: SYSTEM SETTINGS (FIXED COLUMN NAMES)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with correct column names
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('ai_settings', '{"provider": "lovable", "model": "openai/gpt-4o-mini"}')
ON CONFLICT (setting_key) DO NOTHING;

-- PART 4: BULLETPROOF TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, full_name, role, approval_status)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    'user',
    'approved'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- Get Plan
  SELECT id INTO v_plan_id FROM public.subscription_plans WHERE is_active = true ORDER BY (name = 'basic') DESC, price ASC LIMIT 1;

  -- Create Subscription
  IF v_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
    VALUES (new.id, v_plan_id, 'active', now(), now() + interval '100 years') ON CONFLICT (user_id) DO NOTHING;
    
    -- Try to initialize usage tracking, but don't fail if it doesn't work
    BEGIN
        INSERT INTO public.usage_tracking (user_id) VALUES (new.id) ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- PART 5: SECURITY POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_super_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_super_admin());
CREATE POLICY "Anyone can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- PART 6: PROMOTE ADMIN
UPDATE public.profiles SET role = 'super_admin', approval_status = 'approved' WHERE email = 'susantalohr@gmail.com';
UPDATE public.profiles SET role = 'user', approval_status = 'approved' WHERE email = 'susanta@sushantadigital.in';

-- PART 7: MANUAL REPAIR FOR GHOST USERS
-- If you already signed up but your profile is missing, this will fix it.
DO $$ 
DECLARE
    u RECORD;
    v_plan_id uuid;
BEGIN
    -- Get default plan again
    SELECT id INTO v_plan_id FROM public.subscription_plans WHERE is_active = true ORDER BY (name = 'basic') DESC, price ASC LIMIT 1;
    
    FOR u IN (SELECT id, email, raw_user_meta_data FROM auth.users) LOOP
        -- Insert profile if missing
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

        -- Insert subscription if missing
        IF v_plan_id IS NOT NULL THEN
            INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
            VALUES (u.id, v_plan_id, 'active', now(), now() + interval '100 years') 
            ON CONFLICT (user_id) DO NOTHING;
            
            INSERT INTO public.usage_tracking (user_id) VALUES (u.id) ON CONFLICT (user_id) DO NOTHING;
        END IF;
    END LOOP;
END $$;
