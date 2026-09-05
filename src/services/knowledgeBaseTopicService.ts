import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type KnowledgeBaseTopicRow = Database["public"]["Tables"]["knowledge_base_topics"]["Row"];

export interface KnowledgeBaseTopic {
  id: string;
  user_id: string;
  channel_id?: string | null;
  subject?: string | null;
  topic: string;
  topic_name: string;
  description?: string | null;
  language: string;
  prompt_context?: string | null;
  ai_instructions?: string | null;
  exam?: string | null;
  grade?: string | null;
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
}

function mapTopic(row: KnowledgeBaseTopicRow): KnowledgeBaseTopic {
  return {
    id: row.id,
    user_id: row.user_id,
    channel_id: row.channel_id,
    subject: row.subject,
    topic: row.topic_name,
    topic_name: row.topic_name,
    description: row.description,
    language: row.language || "bn",
    prompt_context: row.ai_instructions,
    ai_instructions: row.ai_instructions,
    exam: row.exam,
    grade: row.grade,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export class KnowledgeBaseTopicService {
  static async list(userId: string, channelId?: string | null): Promise<KnowledgeBaseTopic[]> {
    let query = supabase
      .from("knowledge_base_topics")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (channelId && channelId !== "all") query = query.eq("channel_id", channelId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapTopic);
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
        topic_name: topic,
        description: input.description?.trim() || null,
        language: input.language || "bn",
        ai_instructions: input.prompt_context?.trim() || null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapTopic(data);
  }

  static async update(
    userId: string,
    topicId: string,
    input: Partial<CreateKnowledgeBaseTopicInput>
  ): Promise<KnowledgeBaseTopic> {
    const payload: Database["public"]["Tables"]["knowledge_base_topics"]["Update"] = {
      updated_at: new Date().toISOString(),
    };

    if (typeof input.topic === "string") {
      const topic = input.topic.trim();
      if (!topic) throw new Error("Topic is required");
      payload.topic_name = topic;
    }
    if (input.subject !== undefined) payload.subject = input.subject?.trim() || null;
    if (input.description !== undefined) payload.description = input.description?.trim() || null;
    if (input.language !== undefined) payload.language = input.language || "bn";
    if (input.prompt_context !== undefined) payload.ai_instructions = input.prompt_context?.trim() || null;
    if (input.channel_id !== undefined) payload.channel_id = input.channel_id || null;

    const { data, error } = await supabase
      .from("knowledge_base_topics")
      .update(payload)
      .eq("id", topicId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw error;
    return mapTopic(data);
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
      .select("subject, topic_name, description, language, ai_instructions")
      .eq("user_id", userId)
      .in("id", topicIds);

    if (channelId && channelId !== "all") query = query.or(`channel_id.eq.${channelId},channel_id.is.null`);

    const { data, error } = await query;
    if (error) throw error;

    return (data || [])
      .map((item) => {
        const parts = [
          item.subject ? `Subject: ${item.subject}` : "",
          `Topic: ${item.topic_name}`,
          item.description ? `Description: ${item.description}` : "",
          item.ai_instructions ? `Teacher context: ${item.ai_instructions}` : "",
        ].filter(Boolean);
        return parts.join("\n");
      })
      .join("\n\n---\n\n")
      .substring(0, 12000);
  }
}
