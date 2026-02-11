-- Update AI settings to use Gemini 2.0 Flash
UPDATE public.system_settings
SET setting_value = '{"provider": "openrouter", "model": "google/gemini-2.0-flash-001", "temperature": 0.7, "system_prompt": "You are a professional quiz expert. Generate high-quality questions. EXACTLY 4 options are required for every question.", "openrouter_api_key": "", "gemini_api_key": ""}'::jsonb
WHERE setting_key = 'ai_settings';
