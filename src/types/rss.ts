export type PostFrequency = 'hourly' | 'daily' | 'weekly' | 'custom';
export type RssItemStatus = 'pending' | 'processing' | 'posted' | 'failed' | 'skipped';
export type RssProcessType = 'fetch' | 'parse' | 'post' | 'quiz_generation';
export type RssLogStatus = 'started' | 'success' | 'error';

export interface RssFeedFilters {
  keywords?: string[];
  categories?: string[];
  exclude_keywords?: string[];
}

export interface RssFeedSettings {
  auto_generate_quiz?: boolean;
  questions_per_quiz?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: 'en' | 'bn' | 'hi';
}

export interface RssFeedSource {
  id: string;
  user_id: string;
  channel_id: string;
  feed_url: string;
  feed_title: string | null;
  feed_description: string | null;
  is_active: boolean;
  post_frequency: PostFrequency;
  custom_interval_minutes: number | null;
  post_format_template: string;
  filters: RssFeedFilters;
  last_fetched_at: string | null;
  last_posted_at: string | null;
  last_error: string | null;
  error_count: number;
  settings: RssFeedSettings;
  created_at: string;
  updated_at: string;
}

export interface RssFeedItem {
  id: string;
  feed_id: string;
  item_guid: string;
  title: string;
  description: string | null;
  content: string | null;
  link: string | null;
  image_url: string | null;
  author: string | null;
  categories: string[] | null;
  published_date: string | null;
  fetched_at: string;
  is_posted: boolean;
  posted_at: string | null;
  telegram_message_id: string | null;
  quiz_generated: boolean;
  quiz_data: any | null;
  status: RssItemStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface RssProcessingLog {
  id: string;
  feed_id: string | null;
  process_type: RssProcessType;
  status: RssLogStatus;
  items_fetched: number;
  items_posted: number;
  error_message: string | null;
  processing_time_ms: number | null;
  metadata: any;
  created_at: string;
}

export interface RssFeedStatistics {
  feed_id: string;
  user_id: string;
  channel_id: string;
  feed_url: string;
  feed_title: string | null;
  is_active: boolean;
  post_frequency: PostFrequency;
  last_fetched_at: string | null;
  last_posted_at: string | null;
  total_items: number;
  posted_items: number;
  pending_items: number;
  failed_items: number;
  latest_item_date: string | null;
  error_count: number;
  last_error: string | null;
}

export interface CreateRssFeedRequest {
  channel_id: string;
  feed_url: string;
  post_frequency?: PostFrequency;
  custom_interval_minutes?: number;
  filters?: RssFeedFilters;
  settings?: RssFeedSettings;
}

export interface UpdateRssFeedRequest {
  is_active?: boolean;
  post_frequency?: PostFrequency;
  custom_interval_minutes?: number;
  filters?: RssFeedFilters;
  settings?: RssFeedSettings;
}

export interface RssFeedPreview {
  feed_title: string;
  feed_description: string;
  items: {
    title: string;
    description: string;
    link: string;
    published_date: string;
  }[];
}
