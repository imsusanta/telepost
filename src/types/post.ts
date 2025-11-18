// Multi-type post system types
export type PostType = 'text' | 'image' | 'poll' | 'pdf' | 'promotional' | 'quiz';
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
export type ParseMode = 'HTML' | 'Markdown' | 'MarkdownV2';

// Poll specific types
export interface PollOption {
  text: string;
  voter_count?: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  is_anonymous?: boolean;
  allows_multiple_answers?: boolean;
  correct_option_id?: number; // For quiz-style polls
  explanation?: string;
}

// Base post interface
export interface ChannelPost {
  id: string;
  user_id: string;
  channel_id: string;
  post_type: PostType;
  title?: string;
  content?: string;
  media_url?: string;
  media_storage_path?: string;
  poll_data?: PollData;
  quiz_data?: any; // Uses existing Quiz type
  parse_mode: ParseMode;
  formatting_options?: Record<string, any>;
  scheduled_time?: string;
  status: PostStatus;
  telegram_message_id?: string;
  sent_at?: string;
  error_message?: string;
  view_count: number;
  engagement_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Post creation/update types
export interface CreateTextPost {
  channel_id: string;
  title?: string;
  content: string;
  parse_mode?: ParseMode;
  scheduled_time?: Date;
}

export interface CreateImagePost {
  channel_id: string;
  title?: string;
  caption?: string;
  image_file: File;
  parse_mode?: ParseMode;
  scheduled_time?: Date;
}

export interface CreatePollPost {
  channel_id: string;
  question: string;
  options: string[]; // Array of option texts
  is_anonymous?: boolean;
  allows_multiple_answers?: boolean;
  correct_option_id?: number;
  explanation?: string;
  scheduled_time?: Date;
}

export interface CreatePDFPost {
  channel_id: string;
  title?: string;
  caption?: string;
  pdf_file: File;
  scheduled_time?: Date;
}

export interface CreatePromotionalPost {
  channel_id: string;
  title: string;
  content: string;
  call_to_action?: string;
  button_url?: string;
  button_text?: string;
  parse_mode?: ParseMode;
  scheduled_time?: Date;
}

export interface CreateQuizPost {
  channel_id: string;
  quiz_data: any; // Uses existing Quiz type
  scheduled_time?: Date;
}

// Union type for all post creation types
export type CreatePostRequest =
  | CreateTextPost
  | CreateImagePost
  | CreatePollPost
  | CreatePDFPost
  | CreatePromotionalPost
  | CreateQuizPost;

// Admin channel assignment types
export interface AdminChannelAssignment {
  id: string;
  admin_id: string;
  channel_id: string;
  can_create_posts: boolean;
  can_edit_posts: boolean;
  can_delete_posts: boolean;
  can_manage_schedule: boolean;
  assigned_by?: string;
  assigned_at: string;
}

export interface AssignAdminToChannel {
  admin_id: string;
  channel_id: string;
  can_create_posts?: boolean;
  can_edit_posts?: boolean;
  can_delete_posts?: boolean;
  can_manage_schedule?: boolean;
}

// Post template types
export interface PostTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  post_type: PostType;
  template_data: Record<string, any>;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePostTemplate {
  name: string;
  description?: string;
  post_type: PostType;
  template_data: Record<string, any>;
  is_public?: boolean;
}

// Accessible channel info
export interface AccessibleChannel {
  channel_id: string;
  channel_name: string;
  access_type: 'owner' | 'admin';
  permissions: {
    can_create_posts: boolean;
    can_edit_posts: boolean;
    can_delete_posts: boolean;
    can_manage_schedule: boolean;
  };
}

// Post filters
export interface PostFilters {
  post_type?: PostType;
  status?: PostStatus;
  channel_id?: string;
  from_date?: Date;
  to_date?: Date;
}

// Post statistics
export interface PostStatistics {
  total_posts: number;
  by_type: Record<PostType, number>;
  by_status: Record<PostStatus, number>;
  total_views: number;
  scheduled_posts: number;
}
