export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
}

export interface QuizMetadata {
  difficulty: 'easy' | 'medium' | 'hard';
  generated_at: string;
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
  difficulty: 'easy' | 'medium' | 'hard';
  systemPrompt?: string;
  channelId?: string;
  language?: 'bn' | 'en' | 'hi';
  useChannelKnowledgeBase?: boolean;
}