-- =============================================
-- SAFE RECOVERY SCRIPT (PART-BY-PART)
-- =============================================

-- PART 1: FIX PROFILES TABLE COLUMNS
-- This uses smaller blocks to prevent one error from stopping everything
DO $$ 
BEGIN
    RAISE NOTICE 'Starting Part 1: Column Fixes...';
    
    -- Ensure role column exists and is correct
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
    ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

    -- Ensure approval_status exists and is correct
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'approval_status') THEN
        ALTER TABLE public.profiles ADD COLUMN approval_status TEXT DEFAULT 'approved';
    END IF;
    ALTER TABLE public.profiles ALTER COLUMN approval_status SET DEFAULT 'approved';

    -- Ensure nullable for optional columns
    ALTER TABLE public.profiles ALTER COLUMN telegram_bot_token DROP NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN telegram_channel_id DROP NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;

    RAISE NOTICE 'Part 1 Completed Successfully.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in Part 1: %', SQLERRM;
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

-- PART 3: RE-SYNC SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.system_settings (key, value)
VALUES ('ai_settings', '{"provider": "lovable", "model": "openai/gpt-4o-mini"}')
ON CONFLICT (key) DO NOTHING;

-- PART 4: REBUILD TRIGGER (MOST CRITICAL)
-- We drop and recreate everything to ensure no conflicts
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
    INSERT INTO public.usage_tracking (user_id) VALUES (new.id) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- PART 5: SECURITY POLICIES (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_super_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_super_admin());
CREATE POLICY "Anyone can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- PART 6: FINAL ADMIN PROMOTION
UPDATE public.profiles SET role = 'super_admin', approval_status = 'approved' WHERE email = 'susantalohr@gmail.com';
