-- Alter the check constraint on auto_schedule_settings to allow 'knowledge_base'
ALTER TABLE auto_schedule_settings 
DROP CONSTRAINT IF EXISTS auto_schedule_settings_source_type_check;

ALTER TABLE auto_schedule_settings 
ADD CONSTRAINT auto_schedule_settings_source_type_check 
CHECK (source_type IN ('question_bank', 'ai_generated', 'knowledge_base'));
