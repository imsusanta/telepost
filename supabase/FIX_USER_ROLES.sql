-- =============================================
-- FIX USER ROLE FOR susanta@sushantadigital.in
-- =============================================
-- This script sets the correct roles:
-- - susantalohr@gmail.com -> super_admin
-- - susanta@sushantadigital.in -> user (regular user)

-- Step 1: Set susanta@sushantadigital.in to 'user' role
UPDATE public.profiles
SET role = 'user'
WHERE email = 'susanta@sushantadigital.in';

-- Step 2: Ensure susantalohr@gmail.com is super_admin
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'susantalohr@gmail.com';

-- Step 3: Verify the changes
SELECT email, role, full_name FROM public.profiles 
WHERE email IN ('susantalohr@gmail.com', 'susanta@sushantadigital.in');

-- Done! Now clear browser cache and re-login to see the changes.
