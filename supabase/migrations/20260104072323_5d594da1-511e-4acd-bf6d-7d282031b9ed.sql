-- Insert AI settings into system_settings table
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'ai_settings',
  '{"provider": "openrouter", "model": "z-ai/glm-4.5-air:free", "temperature": 0.7}'::jsonb,
  'AI provider and model configuration for quiz generation and document processing'
)
ON CONFLICT (setting_key) DO NOTHING;