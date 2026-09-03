import { supabase } from '@/integrations/supabase/client';
import type {
  KnowledgeBaseTopic,
  CreateTopicRequest,
  UpdateTopicRequest,
} from '@/types/knowledgeBase';

export class KnowledgeBaseService {
  static readonly MAX_SYSTEM_PROMPT_LENGTH = 6000;

  // ============ TOPICS ============

  static async getTopics(filters?: {
    channelId?: string;
    subject?: string;
    search?: string;
    language?: string;
  }): Promise<KnowledgeBaseTopic[]> {
    let query = supabase
      .from('knowledge_base_topics')
      .select('*')
      .order('updated_at', { ascending: false });

    if (filters?.channelId) query = query.eq('channel_id', filters.channelId);
    if (filters?.subject) query = query.ilike('subject', `%${filters.subject}%`);
    if (filters?.search) {
      query = query.or(
        `topic_name.ilike.%${filters.search}%,subject.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }
    if (filters?.language) query = query.eq('language', filters.language);

    const { data, error } = await query;
    if (error) throw error;
    return (data as KnowledgeBaseTopic[]) || [];
  }

  static async getTopic(id: string): Promise<KnowledgeBaseTopic | null> {
    const { data, error } = await supabase
      .from('knowledge_base_topics')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as KnowledgeBaseTopic | null;
  }

  static async createTopic(topic: CreateTopicRequest): Promise<KnowledgeBaseTopic> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('knowledge_base_topics')
      .insert({
        ...topic,
        user_id: user.id,
        language: topic.language || 'bn',
      })
      .select()
      .single();
    if (error) throw error;
    return data as KnowledgeBaseTopic;
  }

  static async createTopicsBulk(topics: CreateTopicRequest[]): Promise<KnowledgeBaseTopic[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    if (!topics.length) return [];

    const rows = topics
      .map((topic) => ({
        ...topic,
        topic_name: topic.topic_name.trim(),
        user_id: user.id,
        language: topic.language || 'bn',
      }))
      .filter((topic) => topic.topic_name.length > 0);

    if (!rows.length) return [];

    const { data, error } = await supabase
      .from('knowledge_base_topics')
      .insert(rows)
      .select();

    if (error) throw error;
    return (data as KnowledgeBaseTopic[]) || [];
  }

  static async updateTopic(id: string, updates: UpdateTopicRequest): Promise<KnowledgeBaseTopic> {
    const { data, error } = await supabase
      .from('knowledge_base_topics')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as KnowledgeBaseTopic;
  }

  static async deleteTopic(id: string): Promise<void> {
    const { error } = await supabase
      .from('knowledge_base_topics')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ============ SUBJECTS (legacy/filter compatibility) ============

  static async getDistinctSubjects(): Promise<string[]> {
    const { data, error } = await supabase
      .from('knowledge_base_topics')
      .select('subject')
      .not('subject', 'is', null)
      .order('subject');
    if (error) throw error;
    return [...new Set((data || []).map(d => d.subject).filter(Boolean))] as string[];
  }

  // ============ USER SYSTEM PROMPT ============

  static async getUserSystemPrompt(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '';

    const { data, error } = await supabase
      .from('user_ai_system_prompts')
      .select('system_prompt')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return data?.system_prompt || '';
  }

  static async saveUserSystemPrompt(prompt: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const systemPrompt = prompt.trim();
    if (systemPrompt.length > this.MAX_SYSTEM_PROMPT_LENGTH) {
      throw new Error(`System Prompt cannot exceed ${this.MAX_SYSTEM_PROMPT_LENGTH.toLocaleString()} characters`);
    }

    const { error } = await supabase
      .from('user_ai_system_prompts')
      .upsert({ user_id: user.id, system_prompt: systemPrompt }, { onConflict: 'user_id' });
    if (error) throw error;
  }

  // ============ TOPIC CONTEXT BUILDER (for AI) ============

  static buildTopicContext(topic: KnowledgeBaseTopic): string {
    const parts: string[] = [];
    parts.push(`Topic: ${topic.topic_name}`);
    if (topic.subject) parts.push(`Subject: ${topic.subject}`);
    if (topic.description) parts.push(`Description: ${topic.description}`);
    if (topic.language) parts.push(`Language: ${topic.language}`);
    if (topic.ai_instructions) parts.push(`AI Instructions: ${topic.ai_instructions}`);
    if (topic.exam) parts.push(`Target Exam: ${topic.exam}`);
    if (topic.grade) parts.push(`Grade/Class: ${topic.grade}`);
    return parts.join('\n');
  }
}
