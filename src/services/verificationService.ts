import { supabase } from '@/integrations/supabase/client';

export async function sendVerificationEmail() {
  const { data, error } = await supabase.functions.invoke('send-verification-email');
  
  if (error) {
    throw new Error(error.message || 'Failed to send verification email');
  }
  
  return data;
}

export async function verifyEmailCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_email_code', {
    p_code: code
  });
  
  if (error) {
    throw new Error(error.message || 'Failed to verify code');
  }
  
  return data;
}

export async function checkEmailVerified(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('email_verified')
    .eq('id', user.id)
    .single();
  
  return profile?.email_verified || false;
}
