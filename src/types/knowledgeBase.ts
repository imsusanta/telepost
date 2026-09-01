export interface KnowledgeBaseTopic {
  id: string;
  user_id: string;
  channel_id?: string | null;
  topic_name: string;
  subject?: string | null;
  description?: string | null;
  language: string;
  ai_instructions?: string | null;
  exam?: string | null;
  grade?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTopicRequest {
  topic_name: string;
  channel_id?: string | null;
  subject?: string | null;
  description?: string | null;
  language?: string;
  ai_instructions?: string | null;
  exam?: string | null;
  grade?: string | null;
}

export type UpdateTopicRequest = Partial<CreateTopicRequest>;

export interface UserAISystemPrompt {
  id: string;
  user_id: string;
  system_prompt: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseTopicContext {
  topic_name: string;
  subject?: string | null;
  description?: string | null;
  language: string;
  ai_instructions?: string | null;
  exam?: string | null;
  grade?: string | null;
}
