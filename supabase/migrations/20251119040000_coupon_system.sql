-- =============================================
-- COUPON SYSTEM FOR BILLING
-- =============================================
-- This migration creates the coupon system for discount codes
-- that can be applied to subscriptions by super admins
-- =============================================

-- ============================================
-- 1. CREATE COUPONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Discount configuration
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),

  -- Usage limits
  max_uses INTEGER, -- NULL = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,

  -- Validity period
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,

  -- Plan restrictions (NULL = applicable to all plans)
  applicable_plans TEXT[], -- Array of plan names ['starter', 'pro', etc.]

  -- Minimum purchase requirements
  min_purchase_amount DECIMAL(10, 2),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_until ON public.coupons(valid_until);

-- ============================================
-- 2. CREATE COUPON USAGE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,

  -- Discount applied
  discount_amount DECIMAL(10, 2) NOT NULL,
  original_amount DECIMAL(10, 2) NOT NULL,
  final_amount DECIMAL(10, 2) NOT NULL,

  -- Metadata
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(coupon_id, user_id) -- Each user can use a coupon once (configurable via max_uses_per_user)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON public.coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON public.coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_subscription_id ON public.coupon_usage(subscription_id);

-- ============================================
-- 3. UPDATE SUBSCRIPTIONS TABLE
-- ============================================

-- Add coupon tracking to subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2);

CREATE INDEX IF NOT EXISTS idx_subscriptions_coupon_id ON public.subscriptions(coupon_id);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES
-- ============================================

-- Coupons: Only super admins can manage, users can validate
CREATE POLICY "Super admins can view all coupons"
ON public.coupons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can insert coupons"
ON public.coupons FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update coupons"
ON public.coupons FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can delete coupons"
ON public.coupons FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
  )
);

-- Coupon Usage: Users can view their own usage, super admins can view all
CREATE POLICY "Users can view their own coupon usage"
ON public.coupon_usage FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all coupon usage"
ON public.coupon_usage FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
  )
);

CREATE POLICY "Users can insert their own coupon usage"
ON public.coupon_usage FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to validate a coupon code
CREATE OR REPLACE FUNCTION validate_coupon(
  p_coupon_code TEXT,
  p_user_id UUID,
  p_plan_name TEXT,
  p_purchase_amount DECIMAL(10, 2)
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  coupon_id UUID,
  discount_type TEXT,
  discount_value DECIMAL(10, 2),
  discount_amount DECIMAL(10, 2),
  final_amount DECIMAL(10, 2)
) AS $$
DECLARE
  v_coupon RECORD;
  v_usage_count INTEGER;
  v_discount_amt DECIMAL(10, 2);
  v_final_amt DECIMAL(10, 2);
BEGIN
  -- Get coupon details
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE code = p_coupon_code
  FOR UPDATE; -- Lock the row to prevent race conditions

  -- Check if coupon exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid coupon code', NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Check if active
  IF NOT v_coupon.is_active THEN
    RETURN QUERY SELECT false, 'This coupon is no longer active', NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Check validity period
  IF v_coupon.valid_from > now() THEN
    RETURN QUERY SELECT false, 'This coupon is not yet valid', NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL;
    RETURN;
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN QUERY SELECT false, 'This coupon has expired', NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Check max uses
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false, 'This coupon has reached its maximum usage limit', NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Check user-specific usage
  SELECT COUNT(*) INTO v_usage_count
  FROM public.coupon_usage
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

  IF v_coupon.max_uses_per_user IS NOT NULL AND v_usage_count >= v_coupon.max_uses_per_user THEN
    RETURN QUERY SELECT false, 'You have already used this coupon', NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Check plan restrictions
  IF v_coupon.applicable_plans IS NOT NULL AND NOT (p_plan_name = ANY(v_coupon.applicable_plans)) THEN
    RETURN QUERY SELECT false, 'This coupon is not applicable to the selected plan', NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Check minimum purchase amount
  IF v_coupon.min_purchase_amount IS NOT NULL AND p_purchase_amount < v_coupon.min_purchase_amount THEN
    RETURN QUERY SELECT false, format('Minimum purchase amount of $%s required', v_coupon.min_purchase_amount), NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Calculate discount
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount_amt := p_purchase_amount * (v_coupon.discount_value / 100);
  ELSE -- fixed_amount
    v_discount_amt := v_coupon.discount_value;
  END IF;

  -- Ensure discount doesn't exceed purchase amount
  IF v_discount_amt > p_purchase_amount THEN
    v_discount_amt := p_purchase_amount;
  END IF;

  v_final_amt := p_purchase_amount - v_discount_amt;

  -- Return success
  RETURN QUERY SELECT
    true,
    NULL::TEXT,
    v_coupon.id,
    v_coupon.discount_type,
    v_coupon.discount_value,
    v_discount_amt,
    v_final_amt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply a coupon (call after payment/subscription creation)
CREATE OR REPLACE FUNCTION apply_coupon(
  p_coupon_code TEXT,
  p_user_id UUID,
  p_subscription_id UUID,
  p_discount_amount DECIMAL(10, 2),
  p_original_amount DECIMAL(10, 2),
  p_final_amount DECIMAL(10, 2)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_coupon_id UUID;
BEGIN
  -- Get coupon ID
  SELECT id INTO v_coupon_id
  FROM public.coupons
  WHERE code = p_coupon_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Insert usage record
  INSERT INTO public.coupon_usage (
    coupon_id,
    user_id,
    subscription_id,
    discount_amount,
    original_amount,
    final_amount
  ) VALUES (
    v_coupon_id,
    p_user_id,
    p_subscription_id,
    p_discount_amount,
    p_original_amount,
    p_final_amount
  );

  -- Increment usage count
  UPDATE public.coupons
  SET current_uses = current_uses + 1
  WHERE id = v_coupon_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or super admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. CREATE TRIGGERS
-- ============================================

-- Update updated_at timestamp on coupons
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION validate_coupon(TEXT, UUID, TEXT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_coupon(TEXT, UUID, UUID, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- ============================================
-- COMPLETED SUCCESSFULLY
-- ============================================

COMMENT ON TABLE public.coupons IS 'Coupon codes for discounts on subscriptions';
COMMENT ON TABLE public.coupon_usage IS 'Track coupon usage by users';
COMMENT ON FUNCTION validate_coupon(TEXT, UUID, TEXT, DECIMAL) IS 'Validate a coupon code and calculate discount';
COMMENT ON FUNCTION apply_coupon(TEXT, UUID, UUID, DECIMAL, DECIMAL, DECIMAL) IS 'Apply a coupon after subscription creation';
COMMENT ON FUNCTION is_super_admin(UUID) IS 'Check if user has super_admin role';
COMMENT ON FUNCTION is_admin(UUID) IS 'Check if user has admin or super_admin role';
