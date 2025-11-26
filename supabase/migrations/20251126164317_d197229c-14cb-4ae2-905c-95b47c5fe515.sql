-- Assign super_admin role to founder@tumdah.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM public.profiles
WHERE email = 'founder@tumdah.com'
ON CONFLICT DO NOTHING;