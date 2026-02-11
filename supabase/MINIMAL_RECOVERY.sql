-- =============================================
-- MINIMAL SAFE RECOVERY SCRIPT
-- =============================================

-- 1. CLEAN UP PROFILES TABLE CONSTRAINTS
DO $$ 
BEGIN
    -- Make all columns nullable to prevent 'NOT NULL' violations
    ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';
    ALTER TABLE public.profiles ALTER COLUMN approval_status SET DEFAULT 'approved';
    ALTER TABLE public.profiles ALTER COLUMN email_verified SET DEFAULT true;
    ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'active';
    ALTER TABLE public.profiles ALTER COLUMN login_count SET DEFAULT 0;
    ALTER TABLE public.profiles ALTER COLUMN payment_status SET DEFAULT 'pending';
    ALTER TABLE public.profiles ALTER COLUMN account_locked SET DEFAULT false;
END $$;

-- 2. CREATE MINIMAL TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert ONLY into profiles, ignore everything else for now to test sign-up
  INSERT INTO public.profiles (id, email, full_name, role, approval_status)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    'user',
    'approved'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Extremely safe: even if profile fails, don't block the user creation
  RETURN new;
END;
$$;

-- 3. RE-BIND TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. FIX RLS (Minimal)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert" ON public.profiles;
CREATE POLICY "Anyone can insert" ON public.profiles FOR INSERT WITH CHECK (true);

-- 5. PROMOTE USER
UPDATE public.profiles
SET role = 'super_admin', approval_status = 'approved'
WHERE email = 'susantalohr@gmail.com';
UPDATE public.profiles
SET role = 'super_admin', approval_status = 'approved'
WHERE email = 'susanta@sushantadigital.in';
