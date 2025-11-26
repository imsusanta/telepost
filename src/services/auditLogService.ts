import { supabase } from '@/integrations/supabase/client';

export type AuditActionType = 
  | 'user_role_changed'
  | 'user_status_changed'
  | 'user_subscription_updated'
  | 'user_subscription_extended'
  | 'user_subscription_cancelled'
  | 'invitation_code_created'
  | 'invitation_code_deleted'
  | 'invitation_code_updated'
  | 'coupon_created'
  | 'coupon_updated'
  | 'coupon_deleted'
  | 'system_setting_updated'
  | 'bulk_action_performed';

export interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  action_type: AuditActionType;
  target_user_id: string | null;
  target_resource_type: string | null;
  target_resource_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  admin_email?: string;
  admin_name?: string;
  target_email?: string;
  target_name?: string;
}

export interface CreateAuditLogParams {
  action_type: AuditActionType;
  target_user_id?: string;
  target_resource_type?: string;
  target_resource_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(params: CreateAuditLogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found for audit log');
      return;
    }

    const insertData = {
      admin_user_id: user.id,
      action_type: params.action_type,
      target_user_id: params.target_user_id || null,
      target_resource_type: params.target_resource_type || null,
      target_resource_id: params.target_resource_id || null,
      old_value: params.old_value ? JSON.parse(JSON.stringify(params.old_value)) : null,
      new_value: params.new_value ? JSON.parse(JSON.stringify(params.new_value)) : null,
      metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : {},
    };

    const { error } = await supabase
      .from('admin_audit_logs')
      .insert([insertData]);

    if (error) {
      console.error('Error creating audit log:', error);
    }
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

/**
 * Get paginated audit logs
 */
export async function getAuditLogs(
  page: number = 1,
  pageSize: number = 50,
  filters?: {
    action_type?: AuditActionType;
    admin_user_id?: string;
    target_user_id?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<{ logs: AuditLogEntry[]; totalCount: number; totalPages: number }> {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('admin_audit_logs')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters?.action_type) {
    query = query.eq('action_type', filters.action_type);
  }
  if (filters?.admin_user_id) {
    query = query.eq('admin_user_id', filters.admin_user_id);
  }
  if (filters?.target_user_id) {
    query = query.eq('target_user_id', filters.target_user_id);
  }
  if (filters?.start_date) {
    query = query.gte('created_at', filters.start_date);
  }
  if (filters?.end_date) {
    query = query.lte('created_at', filters.end_date);
  }

  const { data: logs, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error('Error fetching audit logs:', error);
    throw new Error(error.message);
  }

  // Fetch admin and target user details
  const adminIds = [...new Set((logs || []).map(l => l.admin_user_id))];
  const targetIds = [...new Set((logs || []).filter(l => l.target_user_id).map(l => l.target_user_id!))];
  const allUserIds = [...new Set([...adminIds, ...targetIds])];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', allUserIds);

  const profileMap = new Map(
    (profiles || []).map(p => [p.id, { email: p.email, full_name: p.full_name }])
  );

  const enrichedLogs: AuditLogEntry[] = (logs || []).map(log => ({
    id: log.id,
    admin_user_id: log.admin_user_id,
    action_type: log.action_type as AuditActionType,
    target_user_id: log.target_user_id,
    target_resource_type: log.target_resource_type,
    target_resource_id: log.target_resource_id,
    old_value: log.old_value as Record<string, unknown> | null,
    new_value: log.new_value as Record<string, unknown> | null,
    metadata: (log.metadata || {}) as Record<string, unknown>,
    ip_address: log.ip_address,
    created_at: log.created_at,
    admin_email: profileMap.get(log.admin_user_id)?.email || 'Unknown',
    admin_name: profileMap.get(log.admin_user_id)?.full_name || undefined,
    target_email: log.target_user_id ? (profileMap.get(log.target_user_id)?.email || undefined) : undefined,
    target_name: log.target_user_id ? (profileMap.get(log.target_user_id)?.full_name || undefined) : undefined,
  }));

  return {
    logs: enrichedLogs,
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Get action type display info
 */
export function getActionTypeInfo(actionType: AuditActionType): { label: string; color: string; icon: string } {
  const actionMap: Record<AuditActionType, { label: string; color: string; icon: string }> = {
    user_role_changed: { label: 'Role Changed', color: 'blue', icon: 'UserCog' },
    user_status_changed: { label: 'Status Changed', color: 'amber', icon: 'UserCheck' },
    user_subscription_updated: { label: 'Subscription Updated', color: 'green', icon: 'CreditCard' },
    user_subscription_extended: { label: 'Subscription Extended', color: 'emerald', icon: 'Clock' },
    user_subscription_cancelled: { label: 'Subscription Cancelled', color: 'red', icon: 'XCircle' },
    invitation_code_created: { label: 'Invitation Created', color: 'purple', icon: 'Plus' },
    invitation_code_deleted: { label: 'Invitation Deleted', color: 'red', icon: 'Trash' },
    invitation_code_updated: { label: 'Invitation Updated', color: 'blue', icon: 'Edit' },
    coupon_created: { label: 'Coupon Created', color: 'purple', icon: 'Tag' },
    coupon_updated: { label: 'Coupon Updated', color: 'blue', icon: 'Edit' },
    coupon_deleted: { label: 'Coupon Deleted', color: 'red', icon: 'Trash' },
    system_setting_updated: { label: 'Setting Updated', color: 'slate', icon: 'Settings' },
    bulk_action_performed: { label: 'Bulk Action', color: 'indigo', icon: 'Layers' },
  };

  return actionMap[actionType] || { label: actionType, color: 'gray', icon: 'Activity' };
}
