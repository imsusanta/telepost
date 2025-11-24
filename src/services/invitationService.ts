import { supabase } from "@/integrations/supabase/client";

export interface InvitationCode {
  id: string;
  code: string;
  created_by: string | null;
  used_by: string | null;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  metadata: any;
  created_at: string;
  used_at: string | null;
  updated_at: string;
}

export interface ValidationResult {
  is_valid: boolean;
  message: string;
  code_id?: string | null;
}

export interface CustomInvitationCodeResult {
  success: boolean;
  message: string;
  code?: string;
  code_id?: string;
}

/**
 * Check if the current user is an admin or super admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc('is_admin', { p_user_id: user.id });

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in isAdmin:', error);
    return false;
  }
}

/**
 * Get all invitation codes (admin only)
 */
export async function getAllInvitationCodes(): Promise<InvitationCode[]> {
  try {
    const { data, error } = await supabase
      .from('invitation_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as InvitationCode[];
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch invitation codes');
  }
}

/**
 * Generate a new invitation code (admin only)
 */
export async function generateInvitationCode(
  maxUses: number = 1,
  expiresInDays: number = 30,
  metadata: any = {}
): Promise<{ code: string; code_id: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Generate a random code
    const code = generateRandomCode(12);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Insert directly into the table
    const { data, error } = await supabase
      .from('invitation_codes')
      .insert({
        code: code,
        created_by: user.id,
        max_uses: maxUses,
        expires_at: expiresAt.toISOString(),
        metadata: metadata,
        is_active: true
      })
      .select('id, code')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to generate invitation code');

    return {
      code: data.code,
      code_id: data.id
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to generate invitation code');
  }
}

/**
 * Validate an invitation code
 */
export async function validateInvitationCode(code: string): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase.rpc('validate_invitation_code', {
      p_code: code.trim().toUpperCase()
    });

    if (error) throw error;
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return {
        is_valid: false,
        message: 'Invalid invitation code',
        code_id: null
      };
    }

    const result = Array.isArray(data) ? data[0] : data;
    return {
      is_valid: result.is_valid || false,
      message: result.message || '',
      code_id: (result as any).code_id || null
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to validate invitation code');
  }
}

/**
 * Deactivate an invitation code (admin only)
 */
export async function deactivateInvitationCode(codeId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('invitation_codes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', codeId);

    if (error) throw error;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to deactivate invitation code');
  }
}

/**
 * Reactivate an invitation code (admin only)
 */
export async function reactivateInvitationCode(codeId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('invitation_codes')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', codeId);

    if (error) throw error;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to reactivate invitation code');
  }
}

/**
 * Delete an invitation code (admin only)
 */
export async function deleteInvitationCode(codeId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('invitation_codes')
      .delete()
      .eq('id', codeId);

    if (error) throw error;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete invitation code');
  }
}

/**
 * Generate a random invitation code string
 */
export function generateRandomCode(length: number = 12): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Generate invitation codes using the edge function (admin only)
 */
export async function generateInvitationCodeViaEdgeFunction(
  count: number = 1,
  maxUses: number = 1,
  expiresInDays: number = 30
): Promise<{ success: boolean; codes: InvitationCode[]; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-invitation-codes', {
      body: {
        count,
        maxUses,
        expiresInDays
      }
    });

    if (error) {
      console.error('Error calling generate-invitation-codes:', error);
      throw new Error(error.message || 'Failed to generate invitation codes');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to generate invitation codes');
    }

    return {
      success: true,
      codes: data.codes as InvitationCode[],
      message: data.message
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to generate invitation codes');
  }
}

/**
 * Create a custom invitation code with a specific code string (admin only)
 */
export async function createCustomInvitationCode(
  customCode: string,
  maxUses: number = 1,
  expiresInDays: number | null = null,
  metadata: any = {}
): Promise<{ code: string; code_id: string; success: boolean; message: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Type assertion needed as this RPC function may not be in generated types
    const { data, error } = await (supabase.rpc as any)('create_custom_invitation_code', {
      p_code: customCode,
      p_created_by: user.id,
      p_max_uses: maxUses,
      p_expires_in_days: expiresInDays,
      p_metadata: metadata
    });

    if (error) throw error;
    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error('Failed to create custom invitation code');
    }

    const result: CustomInvitationCodeResult = Array.isArray(data) ? data[0] : data;

    if (!result.success) {
      throw new Error(result.message || 'Failed to create custom invitation code');
    }

    return {
      code: result.code || '',
      code_id: result.code_id || '',
      success: result.success,
      message: result.message
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create custom invitation code');
  }
}

/**
 * Create a batch of invitation codes
 */
export async function createInvitationCodeBatch(
  count: number,
  maxUsesPerCode: number = 1,
  expiresInDays: number = 30,
  batchName: string = 'Unnamed Batch',
  description: string = ''
): Promise<InvitationCode[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const codes: InvitationCode[] = [];

    for (let i = 0; i < count; i++) {
      const result = await generateInvitationCode(maxUsesPerCode, expiresInDays, {
        batch_name: batchName,
        batch_description: description
      });

      // Fetch the full code details
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('id', result.code_id)
        .single();

      if (error) throw error;
      if (data) codes.push(data as InvitationCode);
    }

    return codes;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create invitation code batch');
  }
}
