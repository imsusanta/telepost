export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_data: Json | null
          quiz_generation_id: string | null
          document_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_data?: Json | null
          quiz_generation_id?: string | null
          document_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_data?: Json | null
          quiz_generation_id?: string | null
          document_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_quiz_generation_id_fkey"
            columns: ["quiz_generation_id"]
            isOneToOne: false
            referencedRelation: "quiz_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      channels: {
        Row: {
          id: string
          user_id: string
          name: string
          telegram_channel_id: string | null
          telegram_bot_token: string | null
          description: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          telegram_channel_id?: string | null
          telegram_bot_token?: string | null
          description?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          telegram_channel_id?: string | null
          telegram_bot_token?: string | null
          description?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      documents: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_size_bytes: number
          file_type: string
          storage_path: string
          title: string | null
          description: string | null
          language: string | null
          extracted_text: string | null
          page_count: number | null
          processing_status: string
          processing_error: string | null
          ai_summary: string | null
          topics: Json | null
          channel_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_size_bytes: number
          file_type?: string
          storage_path: string
          title?: string | null
          description?: string | null
          language?: string | null
          extracted_text?: string | null
          page_count?: number | null
          processing_status?: string
          processing_error?: string | null
          ai_summary?: string | null
          topics?: Json | null
          channel_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_size_bytes?: number
          file_type?: string
          storage_path?: string
          title?: string | null
          description?: string | null
          language?: string | null
          extracted_text?: string | null
          page_count?: number | null
          processing_status?: string
          processing_error?: string | null
          ai_summary?: string | null
          topics?: Json | null
          channel_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      leaderboards: {
        Row: {
          id: string
          user_id: string
          student_name: string | null
          student_telegram_id: string | null
          board_type: string
          board_key: string | null
          total_quizzes_taken: number
          total_questions_answered: number
          total_correct_answers: number
          average_score: number
          total_points: number
          rank: number | null
          level: number
          experience_points: number
          badges: Json | null
          last_quiz_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          student_name?: string | null
          student_telegram_id?: string | null
          board_type: string
          board_key?: string | null
          total_quizzes_taken?: number
          total_questions_answered?: number
          total_correct_answers?: number
          average_score?: number
          total_points?: number
          rank?: number | null
          level?: number
          experience_points?: number
          badges?: Json | null
          last_quiz_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          student_name?: string | null
          student_telegram_id?: string | null
          board_type?: string
          board_key?: string | null
          total_quizzes_taken?: number
          total_questions_answered?: number
          total_correct_answers?: number
          average_score?: number
          total_points?: number
          rank?: number | null
          level?: number
          experience_points?: number
          badges?: Json | null
          last_quiz_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          telegram_bot_token: string | null
          telegram_channel_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          telegram_bot_token?: string | null
          telegram_channel_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          telegram_bot_token?: string | null
          telegram_channel_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_banks: {
        Row: {
          id: string
          user_id: string | null
          question: string
          options: Json
          correct_option_index: number
          explanation: string | null
          topic: string
          subject: string | null
          difficulty: string
          language: string
          tags: Json | null
          source: string | null
          source_document_id: string | null
          times_used: number
          times_correct: number
          times_incorrect: number
          is_active: boolean
          is_public: boolean
          channel_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          question: string
          options: Json
          correct_option_index: number
          explanation?: string | null
          topic: string
          subject?: string | null
          difficulty?: string
          language?: string
          tags?: Json | null
          source?: string | null
          source_document_id?: string | null
          times_used?: number
          times_correct?: number
          times_incorrect?: number
          is_active?: boolean
          is_public?: boolean
          channel_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          question?: string
          options?: Json
          correct_option_index?: number
          explanation?: string | null
          topic?: string
          subject?: string | null
          difficulty?: string
          language?: string
          tags?: Json | null
          source?: string | null
          source_document_id?: string | null
          times_used?: number
          times_correct?: number
          times_incorrect?: number
          is_active?: boolean
          is_public?: boolean
          channel_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_banks_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_banks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_banks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      quiz_generations: {
        Row: {
          id: string
          user_id: string
          topic: string
          question_count: number
          difficulty: string
          language: string
          source_type: string
          source_document_id: string | null
          quiz_data: Json
          delivery_method: string | null
          telegram_chat_id: string | null
          scheduled_post_id: string | null
          channel_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic: string
          question_count: number
          difficulty: string
          language?: string
          source_type?: string
          source_document_id?: string | null
          quiz_data: Json
          delivery_method?: string | null
          telegram_chat_id?: string | null
          scheduled_post_id?: string | null
          channel_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic?: string
          question_count?: number
          difficulty?: string
          language?: string
          source_type?: string
          source_document_id?: string | null
          quiz_data?: Json
          delivery_method?: string | null
          telegram_chat_id?: string | null
          scheduled_post_id?: string | null
          channel_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_generations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_generations_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      quiz_responses: {
        Row: {
          id: string
          user_id: string | null
          quiz_generation_id: string | null
          student_name: string | null
          student_telegram_id: string | null
          student_email: string | null
          responses: Json
          score: number
          total_questions: number
          percentage: number
          time_taken_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          quiz_generation_id?: string | null
          student_name?: string | null
          student_telegram_id?: string | null
          student_email?: string | null
          responses: Json
          score: number
          total_questions: number
          percentage: number
          time_taken_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          quiz_generation_id?: string | null
          student_name?: string | null
          student_telegram_id?: string | null
          student_email?: string | null
          responses?: Json
          score?: number
          total_questions?: number
          percentage?: number
          time_taken_seconds?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_quiz_generation_id_fkey"
            columns: ["quiz_generation_id"]
            isOneToOne: false
            referencedRelation: "quiz_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      scheduled_telegram_posts: {
        Row: {
          chat_id: string
          created_at: string
          error_message: string | null
          id: string
          quiz_data: Json
          scheduled_time: string
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          chat_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          quiz_data: Json
          scheduled_time: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          chat_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          quiz_data?: Json
          scheduled_time?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_telegram_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          display_name: string
          price: number
          billing_period: string
          max_telegram_channels: number
          max_pdf_storage_gb: number
          max_quizzes_per_month: number | null
          max_batch_quiz_generation: number
          max_question_bank_size: number
          has_advanced_ai: boolean
          has_auto_scheduling: boolean
          has_auto_pdf_explanations: boolean
          has_analytics_dashboard: boolean
          has_leaderboards: boolean
          has_custom_branding: boolean
          has_multi_language: boolean
          has_priority_support: boolean
          has_api_access: boolean
          has_white_label: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          price: number
          billing_period?: string
          max_telegram_channels?: number
          max_pdf_storage_gb?: number
          max_quizzes_per_month?: number | null
          max_batch_quiz_generation?: number
          max_question_bank_size?: number
          has_advanced_ai?: boolean
          has_auto_scheduling?: boolean
          has_auto_pdf_explanations?: boolean
          has_analytics_dashboard?: boolean
          has_leaderboards?: boolean
          has_custom_branding?: boolean
          has_multi_language?: boolean
          has_priority_support?: boolean
          has_api_access?: boolean
          has_white_label?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          price?: number
          billing_period?: string
          max_telegram_channels?: number
          max_pdf_storage_gb?: number
          max_quizzes_per_month?: number | null
          max_batch_quiz_generation?: number
          max_question_bank_size?: number
          has_advanced_ai?: boolean
          has_auto_scheduling?: boolean
          has_auto_pdf_explanations?: boolean
          has_analytics_dashboard?: boolean
          has_leaderboards?: boolean
          has_custom_branding?: boolean
          has_multi_language?: boolean
          has_priority_support?: boolean
          has_api_access?: boolean
          has_white_label?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          status?: string
          current_period_start?: string
          current_period_end: string
          cancel_at_period_end?: boolean
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          status?: string
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      support_ticket_messages: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          message: string
          is_staff_reply: boolean
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          message: string
          is_staff_reply?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          message?: string
          is_staff_reply?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      support_tickets: {
        Row: {
          id: string
          user_id: string
          subject: string
          description: string
          priority: string
          status: string
          category: string | null
          assigned_to: string | null
          resolution: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject: string
          description: string
          priority?: string
          status?: string
          category?: string | null
          assigned_to?: string | null
          resolution?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject?: string
          description?: string
          priority?: string
          status?: string
          category?: string | null
          assigned_to?: string | null
          resolution?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      usage_tracking: {
        Row: {
          id: string
          user_id: string
          quizzes_generated_this_month: number
          pdfs_uploaded_this_month: number
          total_quizzes_generated: number
          total_pdfs_uploaded: number
          total_storage_used_bytes: number
          current_period_start: string
          last_reset_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          quizzes_generated_this_month?: number
          pdfs_uploaded_this_month?: number
          total_quizzes_generated?: number
          total_pdfs_uploaded?: number
          total_storage_used_bytes?: number
          current_period_start?: string
          last_reset_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          quizzes_generated_this_month?: number
          pdfs_uploaded_this_month?: number
          total_quizzes_generated?: number
          total_pdfs_uploaded?: number
          total_storage_used_bytes?: number
          current_period_start?: string
          last_reset_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_branding: {
        Row: {
          id: string
          user_id: string
          logo_url: string | null
          logo_storage_path: string | null
          primary_color: string | null
          secondary_color: string | null
          pdf_header: string | null
          pdf_footer: string | null
          institute_name: string | null
          institute_website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          logo_url?: string | null
          logo_storage_path?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          pdf_header?: string | null
          pdf_footer?: string | null
          institute_name?: string | null
          institute_website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          logo_url?: string | null
          logo_storage_path?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          pdf_header?: string | null
          pdf_footer?: string | null
          institute_name?: string | null
          institute_website?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branding_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_plan: {
        Args: {
          p_user_id: string
        }
        Returns: {
          plan_name: string
          plan_features: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
