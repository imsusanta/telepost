-- =============================================
-- FORCE ADMIN SETUP (ALL-IN-ONE FIX)
-- =============================================

-- BLOCK 1: ENSURE PROFILES TABLE
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
    RAISE NOTICE 'Profiles table checked.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Note: %', SQLERRM;
END $$;

-- BLOCK 2: SECURITY FUNCTIONS (SUPPORTING FRONTEND RPC)
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid DEFAULT auth.uid()) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id AND role = 'super_admin'
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

-- BLOCK 3: SYNC ALL AUTH USERS TO PROFILES
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
                WHEN u.email = 'susantalohr@gmail.com' THEN 'super_admin' 
                WHEN u.email = 'susanta@sushantadigital.in' THEN 'super_admin' -- Temporary for testing
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
        
        RAISE NOTICE 'Synced user: %', u.email;
    END LOOP;
END $$;

-- BLOCK 4: FIX REGISTRATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
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
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
AFTER INSERT ON auth.users 
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- BLOCK 5: RESET RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can select" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update" ON public.profiles;

CREATE POLICY "Anyone can select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Anyone can update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_super_admin(auth.uid()));

-- FINAL SUMMARY
DO $$ 
BEGIN 
    RAISE NOTICE '--- SETUP COMPLETE ---';
    RAISE NOTICE 'Users in profiles: %', (SELECT count(*) FROM public.profiles);
    RAISE NOTICE 'Admin Status for susantalohr@gmail.com: %', (SELECT role FROM public.profiles WHERE email = 'susantalohr@gmail.com');
END $$;
