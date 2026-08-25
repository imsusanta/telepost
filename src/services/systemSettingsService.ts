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

export type AIProvider = 'openrouter' | 'cloudflare';

export interface AISettings {
  provider: AIProvider;
  model: string;
  image_model: string;
  openrouter_image_model?: string;
  temperature: number;
  system_prompt?: string;
  openrouter_api_key?: string;
  cloudflare_account_id?: string;
  cloudflare_api_token?: string;
}

export interface TelegramSettings {
  global_bot_token: string;
  fallback_enabled: boolean;
}

export interface PaymentSettings {
  razorpay_key_id: string;
  razorpay_key_secret: string;
  razorpay_webhook_secret: string;
}

export interface SystemSettings {
  invitation_defaults: InvitationDefaults;
  user_defaults: UserDefaults;
  subscription_defaults: SubscriptionDefaults;
  system_maintenance: SystemMaintenance;
  ai_settings: AISettings;
  telegram_settings: TelegramSettings;
  payment_settings: PaymentSettings;
}

type SettingKey = keyof SystemSettings;

const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'openrouter',
  model: '',
  image_model: '',
  openrouter_image_model: '',
  temperature: 0.7,
  system_prompt: '',
  openrouter_api_key: '',
  cloudflare_account_id: '',
  cloudflare_api_token: '',
};

export async function getAllSettings(): Promise<SystemSettings> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value');

  if (error) throw new Error(`Failed to fetch system settings: ${error.message}`);

  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) settings[row.setting_key] = row.setting_value;

  return {
    invitation_defaults: (settings.invitation_defaults as InvitationDefaults | undefined) ?? {
      default_max_uses: 10,
      default_expiry_days: 30,
      allow_unlimited: true,
      allow_custom_codes: true,
    },
    user_defaults: (settings.user_defaults as UserDefaults | undefined) ?? {
      auto_approve_signups: true,
      default_role: 'user',
      email_verification_required: true,
    },
    subscription_defaults: (settings.subscription_defaults as SubscriptionDefaults | undefined) ?? {
      trial_days: 7,
      grace_period_days: 3,
      auto_cancel_expired: false,
    },
    system_maintenance: (settings.system_maintenance as SystemMaintenance | undefined) ?? {
      maintenance_mode: false,
      maintenance_message: 'System is under maintenance. Please try again later.',
    },
    ai_settings: {
      ...DEFAULT_AI_SETTINGS,
      ...((settings.ai_settings as Partial<AISettings> | undefined) ?? {}),
    },
    telegram_settings: (settings.telegram_settings as TelegramSettings | undefined) ?? {
      global_bot_token: '',
      fallback_enabled: true,
    },
    payment_settings: (settings.payment_settings as PaymentSettings | undefined) ?? {
      razorpay_key_id: '',
      razorpay_key_secret: '',
      razorpay_webhook_secret: '',
    },
  };
}

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

export async function updateSetting<K extends SettingKey>(
  key: K,
  value: SystemSettings[K],
): Promise<void> {
  const oldValue = await getSetting(key);
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('system_settings')
    .upsert({
      setting_key: key,
      setting_value: JSON.parse(JSON.stringify(value)),
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'setting_key',
    });

  if (error) throw new Error(`Failed to update ${String(key)}: ${error.message}`);

  try {
    await logAdminAction({
      action_type: 'system_setting_updated',
      target_resource_type: 'system_setting',
      target_resource_id: key,
      old_value: oldValue as unknown as Record<string, unknown>,
      new_value: value as unknown as Record<string, unknown>,
      metadata: { setting_key: key },
    });
  } catch (auditError) {
    console.warn('Failed to record admin audit log for setting update:', auditError);
  }
}

export const updateInvitationDefaults = (value: InvitationDefaults) => updateSetting('invitation_defaults', value);
export const updateUserDefaults = (value: UserDefaults) => updateSetting('user_defaults', value);
export const updateSubscriptionDefaults = (value: SubscriptionDefaults) => updateSetting('subscription_defaults', value);
export const updateMaintenanceSettings = (value: SystemMaintenance) => updateSetting('system_maintenance', value);

export async function toggleMaintenanceMode(enabled: boolean): Promise<void> {
  const current = await getSetting('system_maintenance');
  if (current) await updateSetting('system_maintenance', { ...current, maintenance_mode: enabled });
}

export async function getAISettings(): Promise<AISettings> {
  const settings = await getSetting('ai_settings');
  return { ...DEFAULT_AI_SETTINGS, ...(settings ?? {}) };
}

export const updateAISettings = (value: AISettings) => updateSetting('ai_settings', value);

export async function getTelegramSettings(): Promise<TelegramSettings> {
  const settings = await getSetting('telegram_settings');
  return settings ?? { global_bot_token: '', fallback_enabled: true };
}

export const updateTelegramSettings = (value: TelegramSettings) => updateSetting('telegram_settings', value);

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const settings = await getSetting('payment_settings');
  return settings ?? { razorpay_key_id: '', razorpay_key_secret: '', razorpay_webhook_secret: '' };
}

export const updatePaymentSettings = (value: PaymentSettings) => updateSetting('payment_settings', value);
