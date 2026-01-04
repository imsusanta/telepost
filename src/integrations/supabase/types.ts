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
      admin_audit_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          target_resource_id: string | null
          target_resource_type: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          target_resource_id?: string | null
          target_resource_type?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          target_resource_id?: string | null
          target_resource_type?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
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
      attendance_records: {
        Row: {
          check_in_method: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          id: string
          late_minutes: number | null
          marked_by: string
          reason: string | null
          session_id: string
          status: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          check_in_method?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          id?: string
          late_minutes?: number | null
          marked_by: string
          reason?: string | null
          session_id: string
          status: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          check_in_method?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          id?: string
          late_minutes?: number | null
          marked_by?: string
          reason?: string | null
          session_id?: string
          status?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          batch_id: string
          course_id: string | null
          created_at: string | null
          created_by: string
          end_time: string | null
          id: string
          notes: string | null
          qr_code: string | null
          qr_expires_at: string | null
          session_date: string
          session_type: string | null
          start_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          batch_id: string
          course_id?: string | null
          created_at?: string | null
          created_by: string
          end_time?: string | null
          id?: string
          notes?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          session_date: string
          session_type?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_id?: string
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          session_date?: string
          session_type?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          capacity: number | null
          course_id: string | null
          created_at: string | null
          created_by: string
          current_strength: number | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string
          status: string | null
          timing: string | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          current_strength?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date: string
          status?: string | null
          timing?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          current_strength?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string
          status?: string | null
          timing?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
      chapters: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_free: boolean | null
          order_index: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          order_index?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          order_index?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
      course_content: {
        Row: {
          batch_ids: string[] | null
          chapter_id: string | null
          course_id: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          file_size_bytes: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_downloadable: boolean | null
          lesson_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          uploaded_by: string
          version: number | null
          visibility: string | null
        }
        Insert: {
          batch_ids?: string[] | null
          chapter_id?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_downloadable?: boolean | null
          lesson_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          uploaded_by: string
          version?: number | null
          visibility?: string | null
        }
        Update: {
          batch_ids?: string[] | null
          chapter_id?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_downloadable?: boolean | null
          lesson_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string
          version?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_content_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_content_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_content_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string
          currency: string | null
          description: string | null
          difficulty_level: string | null
          duration_hours: number | null
          end_date: string | null
          enrollment_limit: number | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          metadata: Json | null
          price: number | null
          slug: string
          start_date: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by: string
          currency?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_hours?: number | null
          end_date?: string | null
          enrollment_limit?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          metadata?: Json | null
          price?: number | null
          slug: string
          start_date?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string
          currency?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_hours?: number | null
          end_date?: string | null
          enrollment_limit?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          metadata?: Json | null
          price?: number | null
          slug?: string
          start_date?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          ai_summary: string | null
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
          topics: string[] | null
          updated_at: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          ai_summary?: string | null
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
          topics?: string[] | null
          updated_at?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          ai_summary?: string | null
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
          topics?: string[] | null
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
      enrollments: {
        Row: {
          amount_paid: number | null
          batch_id: string | null
          certificate_issued: boolean | null
          certificate_url: string | null
          completed_lessons: string[] | null
          completion_date: string | null
          coupon_code: string | null
          course_id: string
          created_at: string | null
          discount_amount: number | null
          enrolled_by: string | null
          enrollment_date: string | null
          id: string
          last_accessed_at: string | null
          notes: string | null
          payment_status: string | null
          progress_percentage: number | null
          roll_number: string | null
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          batch_id?: string | null
          certificate_issued?: boolean | null
          certificate_url?: string | null
          completed_lessons?: string[] | null
          completion_date?: string | null
          coupon_code?: string | null
          course_id: string
          created_at?: string | null
          discount_amount?: number | null
          enrolled_by?: string | null
          enrollment_date?: string | null
          id?: string
          last_accessed_at?: string | null
          notes?: string | null
          payment_status?: string | null
          progress_percentage?: number | null
          roll_number?: string | null
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          batch_id?: string | null
          certificate_issued?: boolean | null
          certificate_url?: string | null
          completed_lessons?: string[] | null
          completion_date?: string | null
          coupon_code?: string | null
          course_id?: string
          created_at?: string | null
          discount_amount?: number | null
          enrolled_by?: string | null
          enrollment_date?: string | null
          id?: string
          last_accessed_at?: string | null
          notes?: string | null
          payment_status?: string | null
          progress_percentage?: number | null
          roll_number?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_assignments: {
        Row: {
          coupon_code: string | null
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          due_date: string | null
          enrollment_id: string | null
          fee_plan_id: string | null
          final_amount: number
          id: string
          notes: string | null
          scholarship_amount: number | null
          status: string | null
          student_id: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          due_date?: string | null
          enrollment_id?: string | null
          fee_plan_id?: string | null
          final_amount: number
          id?: string
          notes?: string | null
          scholarship_amount?: number | null
          status?: string | null
          student_id: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          due_date?: string | null
          enrollment_id?: string | null
          fee_plan_id?: string | null
          final_amount?: number
          id?: string
          notes?: string | null
          scholarship_amount?: number | null
          status?: string | null
          student_id?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_assignments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_assignments_fee_plan_id_fkey"
            columns: ["fee_plan_id"]
            isOneToOne: false
            referencedRelation: "fee_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_plans: {
        Row: {
          amount: number
          batch_id: string | null
          course_id: string | null
          created_at: string | null
          created_by: string
          currency: string | null
          description: string | null
          grace_period_days: number | null
          id: string
          installments_allowed: boolean | null
          is_active: boolean | null
          late_fee_percentage: number | null
          max_installments: number | null
          name: string
          plan_type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          batch_id?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          currency?: string | null
          description?: string | null
          grace_period_days?: number | null
          id?: string
          installments_allowed?: boolean | null
          is_active?: boolean | null
          late_fee_percentage?: number | null
          max_installments?: number | null
          name: string
          plan_type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          currency?: string | null
          description?: string | null
          grace_period_days?: number | null
          id?: string
          installments_allowed?: boolean | null
          is_active?: boolean | null
          late_fee_percentage?: number | null
          max_installments?: number | null
          name?: string
          plan_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_plans_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_plans_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_schedules: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          fee_assignment_id: string
          id: string
          installment_number: number
          late_fee: number | null
          paid_amount: number | null
          payment_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          fee_assignment_id: string
          id?: string
          installment_number: number
          late_fee?: number | null
          paid_amount?: number | null
          payment_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          fee_assignment_id?: string
          id?: string
          installment_number?: number
          late_fee?: number | null
          paid_amount?: number | null
          payment_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installment_schedules_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_schedules_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
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
      invoices: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          due_date: string | null
          fee_assignment_id: string | null
          id: string
          invoice_number: string
          notes: string | null
          paid_date: string | null
          payment_id: string | null
          pdf_url: string | null
          status: string | null
          student_id: string
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          due_date?: string | null
          fee_assignment_id?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          paid_date?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          status?: string | null
          student_id: string
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          due_date?: string | null
          fee_assignment_id?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_date?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          status?: string | null
          student_id?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
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
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          batch_id: string | null
          created_at: string | null
          end_date: string
          id: string
          leave_type: string
          reason: string
          rejection_reason: string | null
          start_date: string
          status: string | null
          student_id: string
          supporting_doc_url: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          leave_type: string
          reason: string
          rejection_reason?: string | null
          start_date: string
          status?: string | null
          student_id: string
          supporting_doc_url?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string
          rejection_reason?: string | null
          start_date?: string
          status?: string | null
          student_id?: string
          supporting_doc_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          enrollment_id: string
          id: string
          last_position_seconds: number | null
          lesson_id: string
          progress_percentage: number | null
          status: string | null
          student_id: string
          time_spent_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          enrollment_id: string
          id?: string
          last_position_seconds?: number | null
          lesson_id: string
          progress_percentage?: number | null
          status?: string | null
          student_id: string
          time_spent_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          enrollment_id?: string
          id?: string
          last_position_seconds?: number | null
          lesson_id?: string
          progress_percentage?: number | null
          status?: string | null
          student_id?: string
          time_spent_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          chapter_id: string
          content_html: string | null
          content_type: string | null
          created_at: string | null
          description: string | null
          id: string
          is_downloadable: boolean | null
          is_free: boolean | null
          order_index: number | null
          title: string
          updated_at: string | null
          video_duration_seconds: number | null
          video_url: string | null
        }
        Insert: {
          chapter_id: string
          content_html?: string | null
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_downloadable?: boolean | null
          is_free?: boolean | null
          order_index?: number | null
          title: string
          updated_at?: string | null
          video_duration_seconds?: number | null
          video_url?: string | null
        }
        Update: {
          chapter_id?: string
          content_html?: string | null
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_downloadable?: boolean | null
          is_free?: boolean | null
          order_index?: number | null
          title?: string
          updated_at?: string | null
          video_duration_seconds?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      live_classes: {
        Row: {
          attendee_count: number | null
          batch_id: string | null
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          duration_minutes: number | null
          id: string
          meeting_id: string | null
          meeting_password: string | null
          meeting_url: string | null
          platform: string | null
          recording_url: string | null
          scheduled_at: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attendee_count?: number | null
          batch_id?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_id?: string | null
          meeting_password?: string | null
          meeting_url?: string | null
          platform?: string | null
          recording_url?: string | null
          scheduled_at: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attendee_count?: number | null
          batch_id?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_id?: string | null
          meeting_password?: string | null
          meeting_url?: string | null
          platform?: string | null
          recording_url?: string | null
          scheduled_at?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          attachment_url: string | null
          content: string
          content_html: string | null
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_published: boolean | null
          priority: string | null
          publish_at: string | null
          read_by: string[] | null
          target_audience: string | null
          target_batch_ids: string[] | null
          target_course_ids: string[] | null
          target_user_ids: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          content: string
          content_html?: string | null
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          publish_at?: string | null
          read_by?: string[] | null
          target_audience?: string | null
          target_batch_ids?: string[] | null
          target_course_ids?: string[] | null
          target_user_ids?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          content?: string
          content_html?: string | null
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          publish_at?: string | null
          read_by?: string[] | null
          target_audience?: string | null
          target_batch_ids?: string[] | null
          target_course_ids?: string[] | null
          target_user_ids?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string | null
          fee_assignment_id: string | null
          id: string
          metadata: Json | null
          notes: string | null
          payment_date: string | null
          payment_gateway_id: string | null
          payment_method: string
          payment_status: string
          receipt_number: string | null
          received_by: string | null
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          fee_assignment_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_date?: string | null
          payment_gateway_id?: string | null
          payment_method: string
          payment_status?: string
          receipt_number?: string | null
          received_by?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          fee_assignment_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_date?: string | null
          payment_gateway_id?: string | null
          payment_method?: string
          payment_status?: string
          receipt_number?: string | null
          received_by?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
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
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
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
      test_analytics: {
        Row: {
          avg_time_seconds: number | null
          correct_attempts: number | null
          difficulty_rating: number | null
          id: string
          question_id: string | null
          skipped_count: number | null
          test_id: string
          topic_wise_stats: Json | null
          total_attempts: number | null
          updated_at: string | null
          wrong_attempts: number | null
        }
        Insert: {
          avg_time_seconds?: number | null
          correct_attempts?: number | null
          difficulty_rating?: number | null
          id?: string
          question_id?: string | null
          skipped_count?: number | null
          test_id: string
          topic_wise_stats?: Json | null
          total_attempts?: number | null
          updated_at?: string | null
          wrong_attempts?: number | null
        }
        Update: {
          avg_time_seconds?: number | null
          correct_attempts?: number | null
          difficulty_rating?: number | null
          id?: string
          question_id?: string | null
          skipped_count?: number | null
          test_id?: string
          topic_wise_stats?: Json | null
          total_attempts?: number | null
          updated_at?: string | null
          wrong_attempts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_analytics_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_analytics_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          answers: Json | null
          attempted_questions: number | null
          correct_answers: number | null
          created_at: string | null
          device_info: Json | null
          id: string
          ip_address: string | null
          passed: boolean | null
          percentage: number | null
          rank: number | null
          score: number | null
          skipped_questions: number | null
          started_at: string | null
          status: string | null
          student_id: string
          submitted_at: string | null
          test_id: string
          time_taken_seconds: number | null
          total_questions: number | null
          wrong_answers: number | null
        }
        Insert: {
          answers?: Json | null
          attempted_questions?: number | null
          correct_answers?: number | null
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          passed?: boolean | null
          percentage?: number | null
          rank?: number | null
          score?: number | null
          skipped_questions?: number | null
          started_at?: string | null
          status?: string | null
          student_id: string
          submitted_at?: string | null
          test_id: string
          time_taken_seconds?: number | null
          total_questions?: number | null
          wrong_answers?: number | null
        }
        Update: {
          answers?: Json | null
          attempted_questions?: number | null
          correct_answers?: number | null
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          passed?: boolean | null
          percentage?: number | null
          rank?: number | null
          score?: number | null
          skipped_questions?: number | null
          started_at?: string | null
          status?: string | null
          student_id?: string
          submitted_at?: string | null
          test_id?: string
          time_taken_seconds?: number | null
          total_questions?: number | null
          wrong_answers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          created_at: string | null
          custom_correct_index: number | null
          custom_explanation: string | null
          custom_options: Json | null
          custom_question: string | null
          id: string
          is_required: boolean | null
          marks: number | null
          order_index: number | null
          question_bank_id: string | null
          test_id: string
        }
        Insert: {
          created_at?: string | null
          custom_correct_index?: number | null
          custom_explanation?: string | null
          custom_options?: Json | null
          custom_question?: string | null
          id?: string
          is_required?: boolean | null
          marks?: number | null
          order_index?: number | null
          question_bank_id?: string | null
          test_id: string
        }
        Update: {
          created_at?: string | null
          custom_correct_index?: number | null
          custom_explanation?: string | null
          custom_options?: Json | null
          custom_question?: string | null
          id?: string
          is_required?: boolean | null
          marks?: number | null
          order_index?: number | null
          question_bank_id?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_question_bank_id_fkey"
            columns: ["question_bank_id"]
            isOneToOne: false
            referencedRelation: "question_banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          batch_id: string | null
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          difficulty: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          instructions: string | null
          is_published: boolean | null
          is_telegram_enabled: boolean | null
          max_attempts: number | null
          metadata: Json | null
          negative_marking: boolean | null
          negative_marks_per_question: number | null
          passing_marks: number | null
          show_correct_answers: boolean | null
          show_result_immediately: boolean | null
          shuffle_options: boolean | null
          shuffle_questions: boolean | null
          start_time: string | null
          status: string | null
          telegram_channel_id: string | null
          test_type: string | null
          title: string
          total_marks: number | null
          updated_at: string | null
        }
        Insert: {
          batch_id?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          is_telegram_enabled?: boolean | null
          max_attempts?: number | null
          metadata?: Json | null
          negative_marking?: boolean | null
          negative_marks_per_question?: number | null
          passing_marks?: number | null
          show_correct_answers?: boolean | null
          show_result_immediately?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          start_time?: string | null
          status?: string | null
          telegram_channel_id?: string | null
          test_type?: string | null
          title: string
          total_marks?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_id?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          is_telegram_enabled?: boolean | null
          max_attempts?: number | null
          metadata?: Json | null
          negative_marking?: boolean | null
          negative_marks_per_question?: number | null
          passing_marks?: number | null
          show_correct_answers?: boolean | null
          show_result_immediately?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          start_time?: string | null
          status?: string | null
          telegram_channel_id?: string | null
          test_type?: string | null
          title?: string
          total_marks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
      calculate_attendance_percentage: {
        Args: { p_batch_id: string; p_student_id: string }
        Returns: number
      }
      consume_invitation_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
      generate_invoice_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_quiz_count: { Args: { p_user_id: string }; Returns: undefined }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_student: { Args: { p_user_id: string }; Returns: boolean }
      is_super_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_teacher: { Args: { p_user_id: string }; Returns: boolean }
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
      app_role:
        | "super_admin"
        | "admin"
        | "user"
        | "teacher"
        | "student"
        | "parent"
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
      app_role: [
        "super_admin",
        "admin",
        "user",
        "teacher",
        "student",
        "parent",
      ],
    },
  },
} as const
