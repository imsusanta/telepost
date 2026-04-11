-- =============================================
-- CREATE SUPER ADMIN USER
-- =============================================
-- This migration creates a super admin user
-- IMPORTANT: Replace the email with your actual super admin email
-- =============================================

-- Step 1: Insert super admin role into user_roles table
-- This uses the email to find the user ID and assigns super_admin role
INSERT INTO public.user_roles (user_id, role)
SELECT
  p.id,
  'super_admin'::app_role
FROM public.profiles p
WHERE p.email = 'susantalohr@gmail.com'  -- REPLACED PLACEHOLDER
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role = 'super_admin'::app_role
  );

-- Step 2: Also update the legacy role column in profiles table for backwards compatibility
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'susantalohr@gmail.com'  -- REPLACED PLACEHOLDER
  AND role != 'super_admin';

-- Alternative: Set the first registered user as super admin (uncomment if needed)
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT
--   p.id,
--   'super_admin'::app_role
-- FROM public.profiles p
-- WHERE p.id = (
--   SELECT id FROM public.profiles
--   ORDER BY created_at ASC
--   LIMIT 1
-- )
-- AND NOT EXISTS (
--   SELECT 1 FROM public.user_roles ur
--   WHERE ur.user_id = p.id AND ur.role = 'super_admin'::app_role
-- );

-- Alternative: Set a specific user ID as super admin (uncomment if needed)
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES (
--   'your-user-id-here'::uuid,
--   'super_admin'::app_role
-- )
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the super admin was created (this will show in migration output)
DO $$
DECLARE
  super_admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO super_admin_count
  FROM public.user_roles
  WHERE role = 'super_admin'::app_role;

  RAISE NOTICE 'Number of super admin users: %', super_admin_count;

  IF super_admin_count = 0 THEN
    RAISE WARNING 'No super admin users found! Please update the migration with a valid email address.';
  END IF;
END $$;
