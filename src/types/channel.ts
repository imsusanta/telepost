export type GenerationFrequency = 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'manual';

export interface ChannelSettings {
  auto_generate_quizzes: boolean;
  default_subject: string;
  default_difficulty: 'easy' | 'medium' | 'hard';
  default_language: 'bn' | 'en' | 'hi';
  questions_per_quiz: number;
  generation_frequency: GenerationFrequency;
  system_prompt: string;
}

export interface Channel {
  id: string;
  user_id: string;
  name: string;
  telegram_channel_id?: string;
  telegram_bot_token?: string;
  description?: string;
  settings: ChannelSettings;
  created_at: string;
  updated_at: string;
}

export interface CreateChannelRequest {
  name: string;
  telegram_channel_id?: string;
  telegram_bot_token?: string;
  description?: string;
  settings?: Partial<ChannelSettings>;
}

export interface UpdateChannelRequest {
  name?: string;
  telegram_channel_id?: string;
  telegram_bot_token?: string;
  description?: string;
  settings?: Partial<ChannelSettings>;
}
