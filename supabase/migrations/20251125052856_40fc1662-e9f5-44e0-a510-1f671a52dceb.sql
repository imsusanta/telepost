-- Create email verification codes table
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  email text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, code)
);

-- Enable RLS
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own verification codes
CREATE POLICY "Users can view own verification codes"
  ON public.email_verification_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow system to insert verification codes
CREATE POLICY "System can insert verification codes"
  ON public.email_verification_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow system to update verification codes
CREATE POLICY "System can update verification codes"
  ON public.email_verification_codes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add email_verified field to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

-- Create function to verify email code
CREATE OR REPLACE FUNCTION public.verify_email_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_verified boolean := false;
BEGIN
  -- Check if code is valid and not expired
  SELECT user_id INTO v_user_id
  FROM public.email_verification_codes
  WHERE code = p_code
    AND user_id = auth.uid()
    AND expires_at > now()
    AND verified_at IS NULL;
  
  IF v_user_id IS NOT NULL THEN
    -- Mark code as verified
    UPDATE public.email_verification_codes
    SET verified_at = now()
    WHERE code = p_code AND user_id = v_user_id;
    
    -- Update profile
    UPDATE public.profiles
    SET email_verified = true
    WHERE id = v_user_id;
    
    v_verified := true;
  END IF;
  
  RETURN v_verified;
END;
$$;