-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  max_uses_per_user INTEGER,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  applicable_plans TEXT[],
  min_purchase_amount NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coupon_usage table
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id),
  discount_amount NUMERIC NOT NULL,
  original_amount NUMERIC NOT NULL,
  final_amount NUMERIC NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for coupons
CREATE POLICY "Anyone can view active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (auth.uid() = created_by);

-- RLS policies for coupon_usage
CREATE POLICY "Users can view their coupon usage"
  ON public.coupon_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert coupon usage"
  ON public.coupon_usage FOR INSERT
  WITH CHECK (true);

-- Create user_roles table and enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Security definer functions for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(p_user_id, 'super_admin'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(p_user_id, 'admin'::app_role) OR public.has_role(p_user_id, 'super_admin'::app_role)
$$;

-- Invitation codes table
CREATE TABLE IF NOT EXISTS public.invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active invitation codes"
  ON public.invitation_codes FOR SELECT
  USING (is_active = true);

-- Add invitation_code_used to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invitation_code_used TEXT;

-- Validate invitation code function
CREATE OR REPLACE FUNCTION public.validate_invitation_code(p_code text)
RETURNS TABLE(is_valid boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN ic.id IS NULL THEN false
      WHEN ic.is_active = false THEN false
      WHEN ic.expires_at IS NOT NULL AND ic.expires_at < now() THEN false
      WHEN ic.max_uses IS NOT NULL AND ic.current_uses >= ic.max_uses THEN false
      ELSE true
    END as is_valid,
    CASE 
      WHEN ic.id IS NULL THEN 'Invalid invitation code'
      WHEN ic.is_active = false THEN 'Invitation code is inactive'
      WHEN ic.expires_at IS NOT NULL AND ic.expires_at < now() THEN 'Invitation code has expired'
      WHEN ic.max_uses IS NOT NULL AND ic.current_uses >= ic.max_uses THEN 'Invitation code has reached maximum uses'
      ELSE 'Valid'
    END as message
  FROM public.invitation_codes ic
  WHERE ic.code = p_code;
END;
$$;

-- Consume invitation code function
CREATE OR REPLACE FUNCTION public.consume_invitation_code(p_code text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invitation_codes
  SET current_uses = current_uses + 1
  WHERE code = p_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses);
  
  IF FOUND THEN
    UPDATE public.profiles
    SET invitation_code_used = p_code
    WHERE id = p_user_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Validate coupon function
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_coupon_code text,
  p_user_id uuid,
  p_plan_name text,
  p_purchase_amount numeric
)
RETURNS TABLE(
  is_valid boolean,
  error_message text,
  coupon_id uuid,
  discount_type text,
  discount_value numeric,
  discount_amount numeric,
  final_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.coupons;
  v_user_usage_count integer;
  v_discount_amount numeric;
  v_final_amount numeric;
BEGIN
  SELECT * INTO v_coupon FROM public.coupons WHERE code = p_coupon_code;
  
  IF v_coupon.id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid coupon code', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;
  
  IF v_coupon.is_active = false THEN
    RETURN QUERY SELECT false, 'Coupon is inactive', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;
  
  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN QUERY SELECT false, 'Coupon has expired', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;
  
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false, 'Coupon usage limit reached', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;
  
  IF v_coupon.max_uses_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count FROM public.coupon_usage WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
    IF v_user_usage_count >= v_coupon.max_uses_per_user THEN
      RETURN QUERY SELECT false, 'You have already used this coupon', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric;
      RETURN;
    END IF;
  END IF;
  
  IF v_coupon.min_purchase_amount IS NOT NULL AND p_purchase_amount < v_coupon.min_purchase_amount THEN
    RETURN QUERY SELECT false, 'Purchase amount does not meet minimum requirement', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;
  
  IF v_coupon.applicable_plans IS NOT NULL AND NOT (p_plan_name = ANY(v_coupon.applicable_plans)) THEN
    RETURN QUERY SELECT false, 'Coupon not applicable to this plan', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;
  
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount_amount := p_purchase_amount * (v_coupon.discount_value / 100);
  ELSE
    v_discount_amount := v_coupon.discount_value;
  END IF;
  
  v_final_amount := GREATEST(p_purchase_amount - v_discount_amount, 0);
  
  RETURN QUERY SELECT true, NULL::text, v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_discount_amount, v_final_amount;
END;
$$;

-- Apply coupon function
CREATE OR REPLACE FUNCTION public.apply_coupon(
  p_coupon_code text,
  p_user_id uuid,
  p_subscription_id uuid,
  p_discount_amount numeric,
  p_original_amount numeric,
  p_final_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon_id uuid;
BEGIN
  SELECT id INTO v_coupon_id FROM public.coupons WHERE code = p_coupon_code;
  
  IF v_coupon_id IS NULL THEN
    RETURN false;
  END IF;
  
  INSERT INTO public.coupon_usage (coupon_id, user_id, subscription_id, discount_amount, original_amount, final_amount)
  VALUES (v_coupon_id, p_user_id, p_subscription_id, p_discount_amount, p_original_amount, p_final_amount);
  
  UPDATE public.coupons SET current_uses = current_uses + 1 WHERE id = v_coupon_id;
  
  RETURN true;
END;
$$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON public.coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON public.coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON public.invitation_codes(code);