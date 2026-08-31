import { supabase } from "@/integrations/supabase/client";

export interface KnowledgeBaseTopic {
  id: string;
  user_id: string;
  channel_id?: string | null;
  subject?: string | null;
  topic: string;
  description?: string | null;
  language: string;
  prompt_context?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeBaseTopicInput {
  channel_id?: string | null;
  subject?: string | null;
  topic: string;
  description?: string | null;
  language?: string;
  prompt_context?: string | null;
  is_active?: boolean;
}

export class KnowledgeBaseTopicService {
  static async list(userId: string, channelId?: string | null): Promise<KnowledgeBaseTopic[]> {
    let query = supabase
      .from("knowledge_base_topics")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (channelId && channelId !== "all") query = query.eq("channel_id", channelId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as KnowledgeBaseTopic[];
  }

  static async create(userId: string, input: CreateKnowledgeBaseTopicInput): Promise<KnowledgeBaseTopic> {
    const topic = input.topic.trim();
    if (!topic) throw new Error("Topic is required");

    const { data, error } = await supabase
      .from("knowledge_base_topics")
      .insert({
        user_id: userId,
        channel_id: input.channel_id || null,
        subject: input.subject?.trim() || null,
        topic,
        description: input.description?.trim() || null,
        language: input.language || "bn",
        prompt_context: input.prompt_context?.trim() || null,
        is_active: input.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as KnowledgeBaseTopic;
  }

  static async update(
    userId: string,
    topicId: string,
    input: Partial<CreateKnowledgeBaseTopicInput>
  ): Promise<KnowledgeBaseTopic> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof input.topic === "string") {
      const topic = input.topic.trim();
      if (!topic) throw new Error("Topic is required");
      payload.topic = topic;
    }
    if (input.subject !== undefined) payload.subject = input.subject?.trim() || null;
    if (input.description !== undefined) payload.description = input.description?.trim() || null;
    if (input.language !== undefined) payload.language = input.language || "bn";
    if (input.prompt_context !== undefined) payload.prompt_context = input.prompt_context?.trim() || null;
    if (input.channel_id !== undefined) payload.channel_id = input.channel_id || null;
    if (input.is_active !== undefined) payload.is_active = input.is_active;

    const { data, error } = await supabase
      .from("knowledge_base_topics")
      .update(payload)
      .eq("id", topicId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw error;
    return data as KnowledgeBaseTopic;
  }

  static async remove(userId: string, topicId: string): Promise<void> {
    const { error } = await supabase
      .from("knowledge_base_topics")
      .delete()
      .eq("id", topicId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  static async getContext(
    userId: string,
    topicIds: string[],
    channelId?: string | null
  ): Promise<string> {
    if (!topicIds.length) return "";

    let query = supabase
      .from("knowledge_base_topics")
      .select("subject, topic, description, language, prompt_context")
      .eq("user_id", userId)
      .eq("is_active", true)
      .in("id", topicIds);

    if (channelId && channelId !== "all") query = query.or(`channel_id.eq.${channelId},channel_id.is.null`);

    const { data, error } = await query;
    if (error) throw error;

    return (data || [])
      .map((item: any) => {
        const parts = [
          item.subject ? `Subject: ${item.subject}` : "",
          `Topic: ${item.topic}`,
          item.description ? `Description: ${item.description}` : "",
          item.prompt_context ? `Teacher context: ${item.prompt_context}` : "",
        ].filter(Boolean);
        return parts.join("\n");
      })
      .join("\n\n---\n\n")
      .substring(0, 12000);
  }
}
