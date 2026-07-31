import { supabase } from '@/integrations/supabase/client';

export type SourceType = 'question_bank' | 'ai_generated' | 'knowledge_base';

export interface AutoScheduleSettings {
    id: string;
    user_id: string;
    channel_id: string;
    enabled: boolean;
    source_type: SourceType;
    questions_per_post: number;
    topics: string[];
    schedule_times: string[];
    timezone: string;
    language: string;
    custom_prompt: string;
    created_at: string;
    updated_at: string;
}

export interface AutoScheduleSettingsInput {
    channel_id: string;
    enabled: boolean;
    source_type: SourceType;
    questions_per_post: number;
    topics: string[];
    schedule_times: string[];
    timezone: string;
    language?: string;
    custom_prompt?: string;
}

function normalizeSetting(setting: any): AutoScheduleSettings {
    if (!setting) return setting;
    const prompt = setting.custom_prompt || '';
    if (prompt.includes('[SOURCE_TYPE:knowledge_base]') || prompt.includes('[KNOWLEDGE_BASE]')) {
        return {
            ...setting,
            source_type: 'knowledge_base',
            custom_prompt: prompt.replace(/\[SOURCE_TYPE:knowledge_base\]\n?/g, '').replace(/\[KNOWLEDGE_BASE\]\n?/g, '').trim(),
        };
    }
    return setting as AutoScheduleSettings;
}

class AutoScheduleService {
    /**
     * Get all auto-schedule settings for a user
     */
    async getSettings(userId: string): Promise<AutoScheduleSettings[]> {
        const { data, error } = await supabase
            .from('auto_schedule_settings')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching auto-schedule settings:', error);
            throw error;
        }

        return (data || []).map(normalizeSetting);
    }

    /**
     * Get auto-schedule settings for a specific channel
     */
    async getChannelSettings(userId: string, channelId: string): Promise<AutoScheduleSettings | null> {
        const { data, error } = await supabase
            .from('auto_schedule_settings')
            .select('*')
            .eq('user_id', userId)
            .eq('channel_id', channelId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching channel auto-schedule settings:', error);
            throw error;
        }

        return data ? normalizeSetting(data) : null;
    }

    /**
     * Create or update auto-schedule settings for a channel
     */
    async upsertSettings(userId: string, settings: AutoScheduleSettingsInput): Promise<AutoScheduleSettings> {
        let payload: Record<string, any> = {
            user_id: userId,
            channel_id: settings.channel_id,
            enabled: settings.enabled,
            source_type: settings.source_type,
            questions_per_post: settings.questions_per_post,
            topics: settings.topics,
            schedule_times: settings.schedule_times,
            timezone: settings.timezone || 'UTC',
            language: settings.language || 'English',
        };

        if (settings.custom_prompt !== undefined) {
            payload.custom_prompt = settings.custom_prompt;
        }

        // Try upserting with full payload first
        let res = await supabase
            .from('auto_schedule_settings')
            .upsert(payload, { onConflict: 'user_id,channel_id' })
            .select()
            .maybeSingle();

        // If DB check constraint blocks 'knowledge_base', encode into custom_prompt with 'ai_generated' fallback
        if (res.error && settings.source_type === 'knowledge_base' && (res.error.message?.includes('auto_schedule_settings_source_type_check') || res.error.message?.includes('check constraint'))) {
            console.warn("Database constraint rejects 'knowledge_base'. Automatically encoding with 'ai_generated' fallback...");
            const basePrompt = settings.custom_prompt || '';
            payload.source_type = 'ai_generated';
            payload.custom_prompt = `[SOURCE_TYPE:knowledge_base]\n${basePrompt}`.trim();

            res = await supabase
                .from('auto_schedule_settings')
                .upsert(payload, { onConflict: 'user_id,channel_id' })
                .select()
                .maybeSingle();
        }

        // If error occurred due to missing optional columns (custom_prompt, language, timezone), fallback gracefully
        if (res.error) {
            console.warn('Upsert with full payload failed, attempting graceful fallback:', res.error.message);

            // Attempt 1: remove custom_prompt if present
            if ('custom_prompt' in payload) {
                delete payload.custom_prompt;
                res = await supabase
                    .from('auto_schedule_settings')
                    .upsert(payload, { onConflict: 'user_id,channel_id' })
                    .select()
                    .maybeSingle();
            }

            // Attempt 2: remove language if it failed
            if (res.error && 'language' in payload) {
                delete payload.language;
                res = await supabase
                    .from('auto_schedule_settings')
                    .upsert(payload, { onConflict: 'user_id,channel_id' })
                    .select()
                    .maybeSingle();
            }

            // Attempt 3: remove timezone if it failed
            if (res.error && 'timezone' in payload) {
                delete payload.timezone;
                res = await supabase
                    .from('auto_schedule_settings')
                    .upsert(payload, { onConflict: 'user_id,channel_id' })
                    .select()
                    .maybeSingle();
            }

            if (res.error) {
                console.error('Error upserting auto-schedule settings:', res.error);
                throw res.error;
            }
        }

        return normalizeSetting(res.data || {});
    }

    /**
     * Toggle enabled status for a channel's auto-schedule
     */
    async toggleEnabled(userId: string, channelId: string, enabled: boolean): Promise<void> {
        const { error } = await supabase
            .from('auto_schedule_settings')
            .update({ enabled })
            .eq('user_id', userId)
            .eq('channel_id', channelId);

        if (error) {
            console.error('Error toggling auto-schedule:', error);
            throw error;
        }
    }

    /**
     * Delete auto-schedule settings for a channel
     */
    async deleteSettings(userId: string, channelId: string): Promise<void> {
        const { error } = await supabase
            .from('auto_schedule_settings')
            .delete()
            .eq('user_id', userId)
            .eq('channel_id', channelId);

        if (error) {
            console.error('Error deleting auto-schedule settings:', error);
            throw error;
        }
    }

    /**
     * Get all enabled auto-schedules (for cron processing)
     */
    async getEnabledSchedules(): Promise<AutoScheduleSettings[]> {
        const { data, error } = await supabase
            .from('auto_schedule_settings')
            .select('*')
            .eq('enabled', true);

        if (error) {
            console.error('Error fetching enabled schedules:', error);
            throw error;
        }

        return (data || []) as unknown as AutoScheduleSettings[];
    }
}

export const autoScheduleService = new AutoScheduleService();
