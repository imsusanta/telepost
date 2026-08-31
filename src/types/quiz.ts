export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
  difficulty?: string;
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
  knowledgeBaseTopicIds?: string[];
  userId?: string;
}
