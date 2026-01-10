-- Insert Telegram settings into system_settings table
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'telegram_settings',
  '{"global_bot_token": "", "fallback_enabled": true}'::jsonb,
  'Global Telegram bot settings for Super Admin'
)
ON CONFLICT (setting_key) DO NOTHING;
