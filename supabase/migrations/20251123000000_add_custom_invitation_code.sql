-- =============================================
-- CUSTOM INVITATION CODE FUNCTION
-- =============================================
-- This migration adds a function to create custom invitation codes
-- =============================================

-- ============================================
-- CREATE CUSTOM INVITATION CODE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.create_custom_invitation_code(
  p_code TEXT,
  p_created_by UUID,
  p_max_uses INTEGER DEFAULT 1,
  p_expires_in_days INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  code TEXT,
  code_id UUID,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_code_id UUID;
  v_is_admin BOOLEAN;
  v_existing_code TEXT;
BEGIN
  -- Check if user is admin or super admin
  SELECT is_admin(p_created_by) INTO v_is_admin;

  IF v_is_admin = false THEN
    RETURN QUERY SELECT
      NULL::TEXT,
      NULL::UUID,
      false,
      'Only administrators can create invitation codes'::TEXT;
    RETURN;
  END IF;

  -- Validate code format (alphanumeric, 3-50 characters)
  IF p_code !~ '^[a-zA-Z0-9]{3,50}$' THEN
    RETURN QUERY SELECT
      NULL::TEXT,
      NULL::UUID,
      false,
      'Code must be 3-50 alphanumeric characters only'::TEXT;
    RETURN;
  END IF;

  -- Check if code already exists
  SELECT code INTO v_existing_code
  FROM public.invitation_codes
  WHERE UPPER(code) = UPPER(p_code);

  IF v_existing_code IS NOT NULL THEN
    RETURN QUERY SELECT
      NULL::TEXT,
      NULL::UUID,
      false,
      'This invitation code already exists'::TEXT;
    RETURN;
  END IF;

  -- Insert the custom invitation code
  INSERT INTO public.invitation_codes (
    code,
    created_by,
    max_uses,
    expires_at,
    metadata,
    is_active
  )
  VALUES (
    UPPER(p_code),  -- Store in uppercase for consistency
    p_created_by,
    p_max_uses,
    CASE
      WHEN p_expires_in_days IS NOT NULL THEN now() + (p_expires_in_days || ' days')::INTERVAL
      ELSE NULL
    END,
    p_metadata,
    true
  )
  RETURNING invitation_codes.id INTO v_code_id;

  RETURN QUERY SELECT
    UPPER(p_code),
    v_code_id,
    true,
    'Custom invitation code created successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION public.create_custom_invitation_code(TEXT, UUID, INTEGER, INTEGER, JSONB) TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
