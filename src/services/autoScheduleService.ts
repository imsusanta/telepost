import { supabase } from '@/integrations/supabase/client';

export type SourceType = 'question_bank' | 'ai_generated';

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

        return (data || []) as unknown as AutoScheduleSettings[];
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

        return data as unknown as AutoScheduleSettings | null;
    }

    /**
     * Create or update auto-schedule settings for a channel
     */
    async upsertSettings(userId: string, settings: AutoScheduleSettingsInput): Promise<AutoScheduleSettings> {
        const { data, error } = await supabase
            .from('auto_schedule_settings')
            .upsert({
                user_id: userId,
                channel_id: settings.channel_id,
                enabled: settings.enabled,
                source_type: settings.source_type,
                questions_per_post: settings.questions_per_post,
                topics: settings.topics,
                schedule_times: settings.schedule_times,
                timezone: settings.timezone,
                language: settings.language || 'English',
            }, {
                onConflict: 'user_id,channel_id'
            })
            .select()
            .single();


        if (error) {
            console.error('Error upserting auto-schedule settings:', error);
            throw error;
        }

        return data as unknown as AutoScheduleSettings;
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
