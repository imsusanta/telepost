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
          created_at: string
          document_id: string | null
          event_data: Json | null
          event_type: string
          id: string
          quiz_generation_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          quiz_generation_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          quiz_generation_id?: string | null
          user_id?: string
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
        ]
      }
      channels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          last_auto_generated_at: string | null
          name: string
          settings: Json | null
          telegram_channel_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          last_auto_generated_at?: string | null
          name: string
          settings?: Json | null
          telegram_channel_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          last_auto_generated_at?: string | null
          name?: string
          settings?: Json | null
          telegram_channel_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          discount_amount: number
          final_amount: number
          id: string
          original_amount: number
          subscription_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          discount_amount: number
          final_amount: number
          id?: string
          original_amount: number
          subscription_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          discount_amount?: number
          final_amount?: number
          id?: string
          original_amount?: number
          subscription_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_plans: string[] | null
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          max_uses_per_user: number | null
          min_purchase_amount: number | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_plans?: string[] | null
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase_amount?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_plans?: string[] | null
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase_amount?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          channel_id: string | null
          created_at: string
          description: string | null
          extracted_text: string | null
          file_name: string
          file_size_bytes: number
          file_type: string
          id: string
          language: string | null
          metadata: Json | null
          page_count: number | null
          processing_error: string | null
          processing_status: string
          storage_path: string
          title: string | null
          updated_at: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          description?: string | null
          extracted_text?: string | null
          file_name: string
          file_size_bytes: number
          file_type: string
          id?: string
          language?: string | null
          metadata?: Json | null
          page_count?: number | null
          processing_error?: string | null
          processing_status?: string
          storage_path: string
          title?: string | null
          updated_at?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          description?: string | null
          extracted_text?: string | null
          file_name?: string
          file_size_bytes?: number
          file_type?: string
          id?: string
          language?: string | null
          metadata?: Json | null
          page_count?: number | null
          processing_error?: string | null
          processing_status?: string
          storage_path?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      invitation_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Relationships: []
      }
      leaderboards: {
        Row: {
          achievements: Json | null
          channel_id: string | null
          correct_answers: number
          created_at: string
          id: string
          quizzes_completed: number
          rank: number | null
          score: number
          streak_days: number
          total_answers: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: Json | null
          channel_id?: string | null
          correct_answers?: number
          created_at?: string
          id?: string
          quizzes_completed?: number
          rank?: number | null
          score?: number
          streak_days?: number
          total_answers?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: Json | null
          channel_id?: string | null
          correct_answers?: number
          created_at?: string
          id?: string
          quizzes_completed?: number
          rank?: number | null
          score?: number
          streak_days?: number
          total_answers?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboards_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          can_purchase_plans: boolean | null
          created_at: string
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          id: string
          invitation_code_used: string | null
          status: string | null
          telegram_channel_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          can_purchase_plans?: boolean | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          invitation_code_used?: string | null
          status?: string | null
          telegram_channel_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          can_purchase_plans?: boolean | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          invitation_code_used?: string | null
          status?: string | null
          telegram_channel_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_banks: {
        Row: {
          channel_id: string | null
          correct_option_index: number
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          language: string | null
          options: Json
          question: string
          source: string | null
          success_rate: number | null
          tags: Json | null
          times_correct: number | null
          times_incorrect: number | null
          times_used: number | null
          topic: string
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          correct_option_index: number
          created_at?: string
          difficulty: string
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          language?: string | null
          options: Json
          question: string
          source?: string | null
          success_rate?: number | null
          tags?: Json | null
          times_correct?: number | null
          times_incorrect?: number | null
          times_used?: number | null
          topic: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          channel_id?: string | null
          correct_option_index?: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          language?: string | null
          options?: Json
          question?: string
          source?: string | null
          success_rate?: number | null
          tags?: Json | null
          times_correct?: number | null
          times_incorrect?: number | null
          times_used?: number | null
          topic?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_banks_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_generations: {
        Row: {
          channel_id: string | null
          created_at: string
          difficulty: string
          document_id: string | null
          error_message: string | null
          generation_time_ms: number | null
          id: string
          metadata: Json | null
          question_count: number
          questions: Json
          request_id: string | null
          status: string
          topic: string
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          difficulty: string
          document_id?: string | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          metadata?: Json | null
          question_count: number
          questions: Json
          request_id?: string | null
          status?: string
          topic: string
          user_id: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          difficulty?: string
          document_id?: string | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          metadata?: Json | null
          question_count?: number
          questions?: Json
          request_id?: string | null
          status?: string
          topic?: string
          user_id?: string
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
            foreignKeyName: "quiz_generations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_index: number
          quiz_generation_id: string | null
          selected_option_index: number
          time_taken_ms: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          question_index: number
          quiz_generation_id?: string | null
          selected_option_index: number
          time_taken_ms?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_index?: number
          quiz_generation_id?: string | null
          selected_option_index?: number
          time_taken_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_quiz_generation_id_fkey"
            columns: ["quiz_generation_id"]
            isOneToOne: false
            referencedRelation: "quiz_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_telegram_posts: {
        Row: {
          chat_id: string
          created_at: string
          error_message: string | null
          id: string
          min_questions_per_interval: number | null
          quiz_data: Json
          scheduled_time: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          min_questions_per_interval?: number | null
          quiz_data: Json
          scheduled_time: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          min_questions_per_interval?: number | null
          quiz_data?: Json
          scheduled_time?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      story_analytics: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          story_id: string
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          story_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_analytics_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "telegram_stories"
            referencedColumns: ["story_id"]
          },
        ]
      }
      story_templates: {
        Row: {
          background_color: string | null
          category: string
          created_at: string | null
          created_by: string | null
          default_stickers: Json | null
          default_text_overlay: Json | null
          description: string | null
          id: string
          is_public: boolean | null
          media_type: string
          name: string
          template_media_url: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          background_color?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          default_stickers?: Json | null
          default_text_overlay?: Json | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          media_type: string
          name: string
          template_media_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          background_color?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          default_stickers?: Json | null
          default_text_overlay?: Json | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          media_type?: string
          name?: string
          template_media_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_period: string
          created_at: string
          description: string | null
          display_name: string
          has_advanced_ai: boolean
          has_analytics_dashboard: boolean
          has_api_access: boolean
          has_auto_pdf_explanations: boolean
          has_auto_scheduling: boolean
          has_custom_branding: boolean
          has_multi_language: boolean
          has_white_label: boolean
          id: string
          is_active: boolean
          max_batch_quiz_generation: number
          max_pdf_storage_gb: number
          max_question_bank_size: number
          max_quizzes_per_month: number | null
          max_telegram_channels: number
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          billing_period?: string
          created_at?: string
          description?: string | null
          display_name: string
          has_advanced_ai?: boolean
          has_analytics_dashboard?: boolean
          has_api_access?: boolean
          has_auto_pdf_explanations?: boolean
          has_auto_scheduling?: boolean
          has_custom_branding?: boolean
          has_multi_language?: boolean
          has_white_label?: boolean
          id?: string
          is_active?: boolean
          max_batch_quiz_generation?: number
          max_pdf_storage_gb?: number
          max_question_bank_size?: number
          max_quizzes_per_month?: number | null
          max_telegram_channels: number
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          description?: string | null
          display_name?: string
          has_advanced_ai?: boolean
          has_analytics_dashboard?: boolean
          has_api_access?: boolean
          has_auto_pdf_explanations?: boolean
          has_auto_scheduling?: boolean
          has_custom_branding?: boolean
          has_multi_language?: boolean
          has_white_label?: boolean
          id?: string
          is_active?: boolean
          max_batch_quiz_generation?: number
          max_pdf_storage_gb?: number
          max_question_bank_size?: number
          max_quizzes_per_month?: number | null
          max_telegram_channels?: number
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          coupon_id: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          discount_amount: number | null
          id: string
          original_price: number | null
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          coupon_id?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          discount_amount?: number | null
          id?: string
          original_price?: number | null
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          coupon_id?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          discount_amount?: number | null
          id?: string
          original_price?: number | null
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_staff: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_staff?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_staff?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_stories: {
        Row: {
          background_color: string | null
          caption: string | null
          channel_id: string | null
          created_at: string | null
          duration_seconds: number | null
          engagement_rate: number | null
          error_message: string | null
          expires_at: string | null
          is_highlight: boolean | null
          media_type: string
          media_url: string
          posted_at: string | null
          reach: number | null
          scheduled_time: string | null
          status: string
          stickers: Json | null
          story_id: string
          telegram_message_id: string | null
          template_id: string | null
          text_overlay: Json | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          background_color?: string | null
          caption?: string | null
          channel_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          engagement_rate?: number | null
          error_message?: string | null
          expires_at?: string | null
          is_highlight?: boolean | null
          media_type: string
          media_url: string
          posted_at?: string | null
          reach?: number | null
          scheduled_time?: string | null
          status?: string
          stickers?: Json | null
          story_id?: string
          telegram_message_id?: string | null
          template_id?: string | null
          text_overlay?: Json | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          background_color?: string | null
          caption?: string | null
          channel_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          engagement_rate?: number | null
          error_message?: string | null
          expires_at?: string | null
          is_highlight?: boolean | null
          media_type?: string
          media_url?: string
          posted_at?: string | null
          reach?: number | null
          scheduled_time?: string | null
          status?: string
          stickers?: Json | null
          story_id?: string
          telegram_message_id?: string | null
          template_id?: string | null
          text_overlay?: Json | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_stories_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_stories_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "story_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          created_at: string
          id: string
          pdfs_uploaded_this_month: number
          quizzes_generated_this_month: number
          total_pdfs_uploaded: number
          total_quizzes_generated: number
          total_storage_used_bytes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pdfs_uploaded_this_month?: number
          quizzes_generated_this_month?: number
          total_pdfs_uploaded?: number
          total_quizzes_generated?: number
          total_storage_used_bytes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pdfs_uploaded_this_month?: number
          quizzes_generated_this_month?: number
          total_pdfs_uploaded?: number
          total_quizzes_generated?: number
          total_storage_used_bytes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_branding: {
        Row: {
          created_at: string
          custom_css: string | null
          font_family: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_css?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_css?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_coupon: {
        Args: {
          p_coupon_code: string
          p_discount_amount: number
          p_final_amount: number
          p_original_amount: number
          p_subscription_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      consume_invitation_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_quiz_count: { Args: { p_user_id: string }; Returns: undefined }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_super_admin: { Args: { p_user_id: string }; Returns: boolean }
      validate_coupon: {
        Args: {
          p_coupon_code: string
          p_plan_name: string
          p_purchase_amount: number
          p_user_id: string
        }
        Returns: {
          coupon_id: string
          discount_amount: number
          discount_type: string
          discount_value: number
          error_message: string
          final_amount: number
          is_valid: boolean
        }[]
      }
      validate_invitation_code: {
        Args: { p_code: string }
        Returns: {
          is_valid: boolean
          message: string
        }[]
      }
      verify_email_code: { Args: { p_code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user"
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
    Enums: {
      app_role: ["super_admin", "admin", "user"],
    },
  },
} as const
