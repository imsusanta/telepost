import { supabase } from '@/integrations/supabase/client';
import { logAdminAction } from './auditLogService';

export interface InvitationDefaults {
  default_max_uses: number;
  default_expiry_days: number;
  allow_unlimited: boolean;
  allow_custom_codes: boolean;
}

export interface UserDefaults {
  auto_approve_signups: boolean;
  default_role: 'user';
  email_verification_required: boolean;
}

export interface SubscriptionDefaults {
  trial_days: number;
  grace_period_days: number;
  auto_cancel_expired: boolean;
}

export interface SystemMaintenance {
  maintenance_mode: boolean;
  maintenance_message: string;
}

export interface AISettings {
  provider: 'openrouter' | 'lovable' | 'gemini' | 'openai';
  model: string;
  temperature: number;
  system_prompt?: string;
  openrouter_api_key?: string;
  gemini_api_key?: string;
  openai_api_key?: string;
}

export interface TelegramSettings {
  global_bot_token: string;
  fallback_enabled: boolean;
}

export interface SystemSettings {
  invitation_defaults: InvitationDefaults;
  user_defaults: UserDefaults;
  subscription_defaults: SubscriptionDefaults;
  system_maintenance: SystemMaintenance;
  ai_settings: AISettings;
  telegram_settings: TelegramSettings;
}

type SettingKey = keyof SystemSettings;

/**
 * Get all system settings
 */
export async function getAllSettings(): Promise<SystemSettings> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value');

  if (error) {
    console.error('Error fetching system settings:', error);
    throw new Error(error.message);
  }

  const settings: Record<string, unknown> = {};

  for (const row of data || []) {
    settings[row.setting_key] = row.setting_value;
  }

  // Return with defaults if any are missing
  return {
    invitation_defaults: (settings.invitation_defaults as InvitationDefaults) || {
      default_max_uses: 10,
      default_expiry_days: 30,
      allow_unlimited: true,
      allow_custom_codes: true,
    },
    user_defaults: (settings.user_defaults as UserDefaults) || {
      auto_approve_signups: true,
      default_role: 'user',
      email_verification_required: true,
    },
    subscription_defaults: (settings.subscription_defaults as SubscriptionDefaults) || {
      trial_days: 7,
      grace_period_days: 3,
      auto_cancel_expired: false,
    },
    system_maintenance: (settings.system_maintenance as SystemMaintenance) || {
      maintenance_mode: false,
      maintenance_message: 'System is under maintenance. Please try again later.',
    },
    ai_settings: (settings.ai_settings as AISettings) || {
      provider: 'lovable',
      model: 'openai/gpt-4o-mini',
      temperature: 0.7,
      system_prompt: '',
      openrouter_api_key: '',
      gemini_api_key: '',
      openai_api_key: '',
    },
    telegram_settings: (settings.telegram_settings as TelegramSettings) || {
      global_bot_token: '',
      fallback_enabled: true,
    },
  };
}

/**
 * Get a specific setting
 */
export async function getSetting<K extends SettingKey>(key: K): Promise<SystemSettings[K] | null> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }

  return data?.setting_value as SystemSettings[K] | null;
}

/**
 * Update a specific setting
 */
export async function updateSetting<K extends SettingKey>(
  key: K,
  value: SystemSettings[K]
): Promise<void> {
  // Get old value for audit log
  const oldValue = await getSetting(key);

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('system_settings')
    .update({
      setting_value: JSON.parse(JSON.stringify(value)),
      updated_by: user?.id,
    })
    .eq('setting_key', key);

  if (error) {
    console.error(`Error updating setting ${key}:`, error);
    throw new Error(error.message);
  }

  // Log the action
  await logAdminAction({
    action_type: 'system_setting_updated',
    target_resource_type: 'system_setting',
    target_resource_id: key,
    old_value: oldValue as unknown as Record<string, unknown>,
    new_value: value as unknown as Record<string, unknown>,
    metadata: { setting_key: key },
  });
}

/**
 * Update invitation defaults
 */
export async function updateInvitationDefaults(defaults: InvitationDefaults): Promise<void> {
  return updateSetting('invitation_defaults', defaults);
}

/**
 * Update user defaults
 */
export async function updateUserDefaults(defaults: UserDefaults): Promise<void> {
  return updateSetting('user_defaults', defaults);
}

/**
 * Update subscription defaults
 */
export async function updateSubscriptionDefaults(defaults: SubscriptionDefaults): Promise<void> {
  return updateSetting('subscription_defaults', defaults);
}

/**
 * Update system maintenance settings
 */
export async function updateMaintenanceSettings(settings: SystemMaintenance): Promise<void> {
  return updateSetting('system_maintenance', settings);
}

/**
 * Toggle maintenance mode
 */
export async function toggleMaintenanceMode(enabled: boolean): Promise<void> {
  const current = await getSetting('system_maintenance');
  if (current) {
    await updateSetting('system_maintenance', {
      ...current,
      maintenance_mode: enabled,
    });
  }
}

/**
 * Get AI settings
 */
export async function getAISettings(): Promise<AISettings> {
  const settings = await getSetting('ai_settings');
  return settings || {
    provider: 'lovable',
    model: 'openai/gpt-4o-mini',
    temperature: 0.7,
    system_prompt: '',
    openrouter_api_key: '',
    gemini_api_key: '',
    openai_api_key: '',
  };
}

/**
 * Update AI settings
 */
export async function updateAISettings(settings: AISettings): Promise<void> {
  return updateSetting('ai_settings', settings);
}

/**
 * Get Telegram settings
 */
export async function getTelegramSettings(): Promise<TelegramSettings> {
  const settings = await getSetting('telegram_settings');
  return settings || {
    global_bot_token: '',
    fallback_enabled: true,
  };
}

/**
 * Update Telegram settings
 */
export async function updateTelegramSettings(settings: TelegramSettings): Promise<void> {
  return updateSetting('telegram_settings', settings);
}
