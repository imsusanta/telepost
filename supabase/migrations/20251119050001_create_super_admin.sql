-- =============================================
-- CREATE SUPER ADMIN USER
-- =============================================
-- This migration updates an existing user to super_admin role
-- Replace the email with your actual super admin email
-- =============================================

-- Update user role to super_admin
-- Replace 'your-email@example.com' with the actual super admin email
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'susantalohr@gmail.com';

-- Alternative: If you want to set the first registered user as super admin
-- Uncomment the following lines and comment out the above UPDATE

-- UPDATE public.profiles
-- SET role = 'super_admin'
-- WHERE id = (
--   SELECT id FROM public.profiles
--   ORDER BY created_at ASC
--   LIMIT 1
-- );

COMMENT ON COLUMN public.profiles.role IS 'User role: user, admin, or super_admin';
