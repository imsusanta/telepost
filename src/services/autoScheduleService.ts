import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;

export type SourceType = 'question_bank' | 'ai_generated' | 'knowledge_base';

export interface AutoScheduleSettings {
    id: string;
    user_id: string;
    channel_id: string;
    enabled: boolean;
    source_type: SourceType;
    questions_per_post: number;
    topics: string[];
    knowledge_base_topic_ids: string[];
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
    knowledge_base_topic_ids?: string[];
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
            knowledge_base_topic_ids: Array.isArray(setting.knowledge_base_topic_ids) ? setting.knowledge_base_topic_ids : [],
            custom_prompt: prompt.replace(/\[SOURCE_TYPE:knowledge_base\]\n?/g, '').replace(/\[KNOWLEDGE_BASE\]\n?/g, '').trim(),
        };
    }
    return { ...setting, knowledge_base_topic_ids: Array.isArray(setting.knowledge_base_topic_ids) ? setting.knowledge_base_topic_ids : [] } as AutoScheduleSettings;
}

class AutoScheduleService {
    async getSettings(userId: string): Promise<AutoScheduleSettings[]> {
        const { data, error } = await supabase.from('auto_schedule_settings').select('*').eq('user_id', userId);
        if (error) throw error;
        return (data || []).map(normalizeSetting);
    }

    async getChannelSettings(userId: string, channelId: string): Promise<AutoScheduleSettings | null> {
        const { data, error } = await supabase.from('auto_schedule_settings').select('*').eq('user_id', userId).eq('channel_id', channelId).maybeSingle();
        if (error) throw error;
        return data ? normalizeSetting(data) : null;
    }

    async upsertSettings(userId: string, settings: AutoScheduleSettingsInput): Promise<AutoScheduleSettings> {
        const payload: Record<string, unknown> = {
            user_id: userId,
            channel_id: settings.channel_id,
            enabled: settings.enabled,
            source_type: settings.source_type,
            questions_per_post: settings.questions_per_post,
            topics: settings.topics,
            knowledge_base_topic_ids: settings.knowledge_base_topic_ids || [],
            schedule_times: settings.schedule_times,
            timezone: settings.timezone || 'UTC',
            language: settings.language || 'English',
        };
        if (settings.custom_prompt !== undefined) payload.custom_prompt = settings.custom_prompt;

        const res = await supabase.from('auto_schedule_settings').upsert(payload, { onConflict: 'user_id,channel_id' }).select().maybeSingle();
        if (res.error) throw res.error;
        return normalizeSetting(res.data || {});
    }

    async toggleEnabled(userId: string, channelId: string, enabled: boolean): Promise<void> {
        const { error } = await supabase.from('auto_schedule_settings').update({ enabled }).eq('user_id', userId).eq('channel_id', channelId);
        if (error) throw error;
    }

    async deleteSettings(userId: string, channelId: string): Promise<void> {
        const { error } = await supabase.from('auto_schedule_settings').delete().eq('user_id', userId).eq('channel_id', channelId);
        if (error) throw error;
    }

    async getEnabledSchedules(): Promise<AutoScheduleSettings[]> {
        const { data, error } = await supabase.from('auto_schedule_settings').select('*').eq('enabled', true);
        if (error) throw error;
        return (data || []).map(normalizeSetting);
    }
}

export const autoScheduleService = new AutoScheduleService();
