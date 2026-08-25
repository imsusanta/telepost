-- AI provider credentials must live only in Supabase Edge Function secrets.
-- Keep provider/model configuration in system_settings, but remove all legacy
-- credential fields from the JSON document.

UPDATE public.system_settings
SET setting_value = COALESCE(setting_value, '{}'::jsonb)
  - 'openrouter_api_key'
  - 'cloudflare_api_token'
  - 'cloudflare_account_id'
  - 'openai_api_key'
  - 'gemini_api_key'
WHERE setting_key = 'ai_settings';

-- The migration is intentionally idempotent so it is safe to re-run.
