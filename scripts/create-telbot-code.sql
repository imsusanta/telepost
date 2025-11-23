-- =============================================
-- CREATE "TELBOT" INVITATION CODE
-- =============================================
-- This script creates the "telbot" invitation code
-- Run this in your Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/sql/new
-- =============================================

-- First, let's check if the code already exists
DO $$
DECLARE
  v_super_admin_id UUID;
  v_existing_code TEXT;
BEGIN
  -- Get the first super admin user
  SELECT id INTO v_super_admin_id
  FROM public.profiles
  WHERE role IN ('super_admin', 'admin')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_super_admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found. Please create an admin user first.';
  END IF;

  -- Check if the code already exists
  SELECT code INTO v_existing_code
  FROM public.invitation_codes
  WHERE UPPER(code) = 'TELBOT';

  IF v_existing_code IS NOT NULL THEN
    RAISE NOTICE 'Invitation code "TELBOT" already exists!';
  ELSE
    -- Insert the "telbot" invitation code
    INSERT INTO public.invitation_codes (
      code,
      created_by,
      max_uses,
      expires_at,
      is_active,
      metadata
    )
    VALUES (
      'TELBOT',                    -- The invitation code
      v_super_admin_id,           -- Created by super admin
      1,                          -- Can be used 1 time (change this if you want more uses)
      NULL,                       -- Never expires (set to NOW() + INTERVAL '90 days' if you want it to expire)
      true,                       -- Is active
      '{"type": "custom", "created_via": "manual_sql", "purpose": "telegram_bot_access"}'::jsonb
    );

    RAISE NOTICE 'Invitation code "TELBOT" created successfully!';
  END IF;
END $$;

-- Verify the code was created
SELECT
  id,
  code,
  max_uses,
  current_uses,
  expires_at,
  is_active,
  metadata,
  created_at
FROM public.invitation_codes
WHERE code = 'TELBOT';
