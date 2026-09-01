import type { KnowledgeBaseTopicContext } from './knowledgeBase';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
  difficulty?: string; // Optional for backward compatibility with old stored DB objects, but never used or shown
}

export interface QuizMetadata {
  generated_at: string;
  standard?: string;
}

export interface Quiz {
  request_id: string;
  topic: string;
  questions: QuizQuestion[];
  metadata: QuizMetadata;
}

export interface QuizConfig {
  topic: string;
  questionCount: number;
  systemPrompt?: string;
  channelId?: string;
  language?: 'bn' | 'en' | 'hi';
  useChannelKnowledgeBase?: boolean; // Deprecated: kept for backward compat
  knowledgeBaseTopic?: KnowledgeBaseTopicContext;
  userId?: string;
}
