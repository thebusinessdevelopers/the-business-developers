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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      buffet_covers: {
        Row: {
          cover_date: string
          covers: number
          id: string
          meal_period: string
          revenue_ugx: number
          source: string
          status: string
        }
        Insert: {
          cover_date: string
          covers: number
          id?: string
          meal_period?: string
          revenue_ugx: number
          source: string
          status?: string
        }
        Update: {
          cover_date?: string
          covers?: number
          id?: string
          meal_period?: string
          revenue_ugx?: number
          source?: string
          status?: string
        }
        Relationships: []
      }
      department_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          form_schema: Json
          id: string
          is_active: boolean | null
          name: string
          slug: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          form_schema: Json
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          form_schema?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          active: boolean | null
          created_at: string | null
          form_schema: Json
          id: string
          name: string
          org_id: string
          report_schedule: Json | null
          slug: string
          template_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          form_schema: Json
          id?: string
          name: string
          org_id: string
          report_schedule?: Json | null
          slug: string
          template_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          form_schema?: Json
          id?: string
          name?: string
          org_id?: string
          report_schedule?: Json | null
          slug?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "department_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hod_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hod_users"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_analysis_cache: {
        Row: {
          analysis_data: Json
          generated_at: string
          id: string
          model_used: string | null
          period_key: string
          period_type: string
        }
        Insert: {
          analysis_data?: Json
          generated_at?: string
          id?: string
          model_used?: string | null
          period_key: string
          period_type: string
        }
        Update: {
          analysis_data?: Json
          generated_at?: string
          id?: string
          model_used?: string | null
          period_key?: string
          period_type?: string
        }
        Relationships: []
      }
      hod_announcements: {
        Row: {
          active: boolean
          body: string
          created_at: string
          created_by: string
          department_id: string | null
          expires_at: string | null
          id: string
          priority: string
          title: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          created_by?: string
          department_id?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          title: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          created_by?: string
          department_id?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hod_announcements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hod_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_daily_reports: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          ai_flags: Json | null
          department_id: string
          edit_history: Json
          edited_at: string | null
          id: string
          last_edited_by: string | null
          report_data: Json
          report_date: string
          review_comments: string | null
          submitted_at: string
          submitted_by: string
          submitted_by_user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          ai_flags?: Json | null
          department_id: string
          edit_history?: Json
          edited_at?: string | null
          id?: string
          last_edited_by?: string | null
          report_data?: Json
          report_date?: string
          review_comments?: string | null
          submitted_at?: string
          submitted_by: string
          submitted_by_user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          ai_flags?: Json | null
          department_id?: string
          edit_history?: Json
          edited_at?: string | null
          id?: string
          last_edited_by?: string | null
          report_data?: Json
          report_date?: string
          review_comments?: string | null
          submitted_at?: string
          submitted_by?: string
          submitted_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hod_daily_reports_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hod_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hod_daily_reports_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "hod_users"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_departments: {
        Row: {
          created_at: string
          hods: string[]
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          hods?: string[]
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          hods?: string[]
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      hod_drafts: {
        Row: {
          created_at: string
          department_id: string
          draft_by: string
          draft_data: Json
          id: string
          report_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          draft_by: string
          draft_data?: Json
          id?: string
          report_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          draft_by?: string
          draft_data?: Json
          id?: string
          report_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hod_drafts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hod_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_error_log: {
        Row: {
          created_at: string
          department_id: string | null
          error_code: string | null
          error_context: Json
          error_message: string
          id: string
          report_date: string | null
          submitted_by: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          error_code?: string | null
          error_context?: Json
          error_message: string
          id?: string
          report_date?: string | null
          submitted_by?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          error_code?: string | null
          error_context?: Json
          error_message?: string
          id?: string
          report_date?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hod_error_log_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hod_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_item_library: {
        Row: {
          category: string
          default_cost_per_unit: number | null
          default_unit: string | null
          department_id: string
          first_seen: string
          id: string
          item_name: string
          last_seen: string
          occurrence_count: number
        }
        Insert: {
          category: string
          default_cost_per_unit?: number | null
          default_unit?: string | null
          department_id: string
          first_seen?: string
          id?: string
          item_name: string
          last_seen?: string
          occurrence_count?: number
        }
        Update: {
          category?: string
          default_cost_per_unit?: number | null
          default_unit?: string | null
          department_id?: string
          first_seen?: string
          id?: string
          item_name?: string
          last_seen?: string
          occurrence_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "hod_item_library_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hod_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_notifications: {
        Row: {
          body_preview: string | null
          created_at: string
          id: string
          is_read: boolean
          recipient_user_id: string
          source_report_id: string | null
          source_thread_id: string | null
          triggered_by_user_id: string | null
          type: string
        }
        Insert: {
          body_preview?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_user_id: string
          source_report_id?: string | null
          source_thread_id?: string | null
          triggered_by_user_id?: string | null
          type: string
        }
        Update: {
          body_preview?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_user_id?: string
          source_report_id?: string | null
          source_thread_id?: string | null
          triggered_by_user_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hod_notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "hod_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hod_notifications_source_report_id_fkey"
            columns: ["source_report_id"]
            isOneToOne: false
            referencedRelation: "hod_daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hod_notifications_source_thread_id_fkey"
            columns: ["source_thread_id"]
            isOneToOne: false
            referencedRelation: "hod_report_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hod_notifications_triggered_by_user_id_fkey"
            columns: ["triggered_by_user_id"]
            isOneToOne: false
            referencedRelation: "hod_users"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_report_media: {
        Row: {
          ai_description: string | null
          ai_error_message: string | null
          ai_status: string
          ai_tags: Json | null
          context_category: string
          created_at: string
          department_id: string
          file_size_bytes: number | null
          generated_filename: string
          google_drive_file_id: string | null
          google_drive_synced_at: string | null
          google_drive_url: string | null
          hod_description: string
          id: string
          mime_type: string | null
          original_filename: string
          report_date: string
          report_id: string | null
          storage_path: string
          synced_locally: boolean
          thumbnail_path: string | null
          uploaded_by_user_id: string | null
        }
        Insert: {
          ai_description?: string | null
          ai_error_message?: string | null
          ai_status?: string
          ai_tags?: Json | null
          context_category: string
          created_at?: string
          department_id: string
          file_size_bytes?: number | null
          generated_filename: string
          google_drive_file_id?: string | null
          google_drive_synced_at?: string | null
          google_drive_url?: string | null
          hod_description: string
          id?: string
          mime_type?: string | null
          original_filename: string
          report_date: string
          report_id?: string | null
          storage_path: string
          synced_locally?: boolean
          thumbnail_path?: string | null
          uploaded_by_user_id?: string | null
        }
        Update: {
          ai_description?: string | null
          ai_error_message?: string | null
          ai_status?: string
          ai_tags?: Json | null
          context_category?: string
          created_at?: string
          department_id?: string
          file_size_bytes?: number | null
          generated_filename?: string
          google_drive_file_id?: string | null
          google_drive_synced_at?: string | null
          google_drive_url?: string | null
          hod_description?: string
          id?: string
          mime_type?: string | null
          original_filename?: string
          report_date?: string
          report_id?: string | null
          storage_path?: string
          synced_locally?: boolean
          thumbnail_path?: string | null
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hod_report_media_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hod_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hod_report_media_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "hod_daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hod_report_media_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "hod_users"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_report_threads: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_admin_note: boolean
          mentions: Json
          parent_id: string | null
          report_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_admin_note?: boolean
          mentions?: Json
          parent_id?: string | null
          report_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_admin_note?: boolean
          mentions?: Json
          parent_id?: string | null
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hod_report_threads_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "hod_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hod_report_threads_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "hod_report_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hod_report_threads_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "hod_daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: string | null
          last_active_at: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hod_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hod_users"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_stock_flags: {
        Row: {
          created_at: string
          department_id: string
          escalated_to: string | null
          flag_type: string
          id: string
          item_names: string[]
          resolution_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          status: string
          suggested_canonical: string | null
        }
        Insert: {
          created_at?: string
          department_id: string
          escalated_to?: string | null
          flag_type: string
          id?: string
          item_names: string[]
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          status?: string
          suggested_canonical?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string
          escalated_to?: string | null
          flag_type?: string
          id?: string
          item_names?: string[]
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          status?: string
          suggested_canonical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hod_stock_flags_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hod_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hod_stock_flags_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "hod_users"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_users: {
        Row: {
          admin_tier: string | null
          admin_title: string | null
          auto_logout_enabled: boolean
          created_at: string
          department_id: string | null
          hod_name: string
          id: string
          idle_timeout_minutes: number
          logout_time: string
          password_display: string | null
          password_hash: string
          role: string
          username: string
        }
        Insert: {
          admin_tier?: string | null
          admin_title?: string | null
          auto_logout_enabled?: boolean
          created_at?: string
          department_id?: string | null
          hod_name: string
          id?: string
          idle_timeout_minutes?: number
          logout_time?: string
          password_display?: string | null
          password_hash: string
          role?: string
          username: string
        }
        Update: {
          admin_tier?: string | null
          admin_title?: string | null
          auto_logout_enabled?: boolean
          created_at?: string
          department_id?: string | null
          hod_name?: string
          id?: string
          idle_timeout_minutes?: number
          logout_time?: string
          password_display?: string | null
          password_hash?: string
          role?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "hod_users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hod_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_verified_stock: {
        Row: {
          admin_notes: string | null
          created_at: string
          department_id: string
          entered_by: string
          entry_date: string
          id: string
          items: Json
          status: string
          stock_type: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          department_id: string
          entered_by: string
          entry_date: string
          id?: string
          items?: Json
          status?: string
          stock_type: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          department_id?: string
          entered_by?: string
          entry_date?: string
          id?: string
          items?: Json
          status?: string
          stock_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hod_verified_stock_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hod_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_briefs: {
        Row: {
          ai_narrative: string | null
          alerts: Json | null
          brief_date: string
          brief_type: string | null
          generated_at: string | null
          id: string
          org_id: string
          status: string | null
          summary: Json | null
          trends: Json | null
        }
        Insert: {
          ai_narrative?: string | null
          alerts?: Json | null
          brief_date: string
          brief_type?: string | null
          generated_at?: string | null
          id?: string
          org_id: string
          status?: string | null
          summary?: Json | null
          trends?: Json | null
        }
        Update: {
          ai_narrative?: string | null
          alerts?: Json | null
          brief_date?: string
          brief_type?: string | null
          generated_at?: string | null
          id?: string
          org_id?: string
          status?: string | null
          summary?: Json | null
          trends?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_briefs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_flags: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          description: string | null
          flag_type: string
          id: string
          org_id: string
          reference_id: string | null
          reference_type: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          title: string
          triggered_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          description?: string | null
          flag_type: string
          id?: string
          org_id: string
          reference_id?: string | null
          reference_type?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title: string
          triggered_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          description?: string | null
          flag_type?: string
          id?: string
          org_id?: string
          reference_id?: string | null
          reference_type?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title?: string
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_flags_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_flags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          created_by: string
          currency: string | null
          due_date: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          invoice_number: string
          line_items: Json
          notes: string | null
          org_id: string
          status: string | null
          total_amount: number
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          created_by: string
          currency?: string | null
          due_date?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          invoice_number: string
          line_items: Json
          notes?: string | null
          org_id: string
          status?: string | null
          total_amount: number
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          created_by?: string
          currency?: string | null
          due_date?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          invoice_number?: string
          line_items?: Json
          notes?: string | null
          org_id?: string
          status?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      item_aliases: {
        Row: {
          alias: string
          confidence: number
          created_at: string
          item_id: string
        }
        Insert: {
          alias: string
          confidence: number
          created_at?: string
          item_id: string
        }
        Update: {
          alias?: string
          confidence?: number
          created_at?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_aliases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          active: boolean
          id: string
          meal_period: string
          name: string
          parent_item_id: string | null
          price_ugx: number
          slug: string
          sub_category: string
          tags: string[]
          top_category: string
          unit: string
        }
        Insert: {
          active?: boolean
          id?: string
          meal_period: string
          name: string
          parent_item_id?: string | null
          price_ugx: number
          slug: string
          sub_category: string
          tags?: string[]
          top_category: string
          unit: string
        }
        Update: {
          active?: boolean
          id?: string
          meal_period?: string
          name?: string
          parent_item_id?: string | null
          price_ugx?: number
          slug?: string
          sub_category?: string
          tags?: string[]
          top_category?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          author_id: string
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          mentions: string[] | null
          org_id: string
          thread_id: string
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          mentions?: string[] | null
          org_id: string
          thread_id: string
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          mentions?: string[] | null
          org_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          org_id: string
          read: boolean | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          org_id: string
          read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          org_id?: string
          read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          country: string | null
          created_at: string | null
          id: string
          location: string | null
          name: string
          onboarding_complete: boolean | null
          room_count: number | null
          slug: string
          subscription_status: string | null
          timezone: string | null
          type: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          name: string
          onboarding_complete?: boolean | null
          room_count?: number | null
          slug: string
          subscription_status?: string | null
          timezone?: string | null
          type?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string
          onboarding_complete?: boolean | null
          room_count?: number | null
          slug?: string
          subscription_status?: string | null
          timezone?: string | null
          type?: string | null
        }
        Relationships: []
      }
      parsing_review_queue: {
        Row: {
          created_at: string
          flag_reason: string
          id: string
          parsed_interpretation: Json | null
          raw_input: string
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          flag_reason: string
          id?: string
          parsed_interpretation?: Json | null
          raw_input: string
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          flag_reason?: string
          id?: string
          parsed_interpretation?: Json | null
          raw_input?: string
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          invoice_id: string | null
          method: string
          org_id: string
          phone: string | null
          receipt_photo_url: string | null
          recorded_by: string
          reference: string | null
          status: string | null
          webhook_payload: Json | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          method: string
          org_id: string
          phone?: string | null
          receipt_photo_url?: string | null
          recorded_by: string
          reference?: string | null
          status?: string | null
          webhook_payload?: Json | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          org_id?: string
          phone?: string | null
          receipt_photo_url?: string | null
          recorded_by?: string
          reference?: string | null
          status?: string | null
          webhook_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          currency: string | null
          id: string
          items: Json
          notes: string | null
          org_id: string
          received_at: string | null
          received_by: string
          status: string | null
          supplier_name: string
          total_amount: number | null
        }
        Insert: {
          currency?: string | null
          id?: string
          items: Json
          notes?: string | null
          org_id: string
          received_at?: string | null
          received_by: string
          status?: string | null
          supplier_name: string
          total_amount?: number | null
        }
        Update: {
          currency?: string | null
          id?: string
          items?: Json
          notes?: string | null
          org_id?: string
          received_at?: string | null
          received_by?: string
          status?: string | null
          supplier_name?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_records: {
        Row: {
          id: string
          item_id: string
          order_date: string
          quantity: number
          source: string
        }
        Insert: {
          id?: string
          item_id: string
          order_date: string
          quantity: number
          source?: string
        }
        Update: {
          id?: string
          item_id?: string
          order_date?: string
          quantity?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_records_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      report_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          mentions: string[] | null
          org_id: string
          report_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          mentions?: string[] | null
          org_id: string
          report_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          mentions?: string[] | null
          org_id?: string
          report_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_reviews_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_section_na: {
        Row: {
          created_at: string | null
          flagged: boolean | null
          id: string
          reason: string | null
          report_id: string
          section_key: string
        }
        Insert: {
          created_at?: string | null
          flagged?: boolean | null
          id?: string
          reason?: string | null
          report_id: string
          section_key: string
        }
        Update: {
          created_at?: string | null
          flagged?: boolean | null
          id?: string
          reason?: string | null
          report_id?: string
          section_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_section_na_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          data: Json
          department_id: string
          id: string
          org_id: string
          report_date: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          submitted_by: string
          sync_id: string | null
        }
        Insert: {
          data: Json
          department_id: string
          id?: string
          org_id: string
          report_date: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_by: string
          sync_id?: string | null
        }
        Update: {
          data?: Json
          department_id?: string
          id?: string
          org_id?: string
          report_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string
          sync_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      requisitions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          department_id: string
          fulfilled_at: string | null
          id: string
          items: Json
          notes: string | null
          org_id: string
          requested_by: string
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department_id: string
          fulfilled_at?: string | null
          id?: string
          items: Json
          notes?: string | null
          org_id: string
          requested_by: string
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department_id?: string
          fulfilled_at?: string | null
          id?: string
          items?: Json
          notes?: string | null
          org_id?: string
          requested_by?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisitions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_records: {
        Row: {
          created_at: string
          id: string
          item_id: string
          quantity: number
          raw_input: string
          sale_date: string
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          quantity: number
          raw_input: string
          sale_date: string
          source: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          quantity?: number
          raw_input?: string
          sale_date?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_records_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          active: boolean | null
          category: string | null
          cost_per_unit: number | null
          created_at: string | null
          current_quantity: number | null
          id: string
          minimum_quantity: number | null
          name: string
          org_id: string
          supplier: string | null
          unit: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_quantity?: number | null
          id?: string
          minimum_quantity?: number | null
          name: string
          org_id: string
          supplier?: string | null
          unit: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_quantity?: number | null
          id?: string
          minimum_quantity?: number | null
          name?: string
          org_id?: string
          supplier?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          item_id: string
          notes: string | null
          org_id: string
          performed_by: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          item_id: string
          notes?: string | null
          org_id: string
          performed_by: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          org_id?: string
          performed_by?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_queue: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          local_id: string | null
          operation: string
          org_id: string
          payload: Json
          status: string | null
          synced_at: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          local_id?: string | null
          operation: string
          org_id: string
          payload: Json
          status?: string | null
          synced_at?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          local_id?: string | null
          operation?: string
          org_id?: string
          payload?: Json
          status?: string | null
          synced_at?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string | null
          created_by: string
          department_id: string | null
          id: string
          org_id: string
          pinned: boolean | null
          thread_type: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          department_id?: string | null
          id?: string
          org_id: string
          pinned?: boolean | null
          thread_type?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          department_id?: string | null
          id?: string
          org_id?: string
          pinned?: boolean | null
          thread_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean | null
          created_at: string | null
          department_id: string | null
          email: string | null
          full_name: string
          id: string
          org_id: string
          password_display: string | null
          phone: string | null
          role: string
          whatsapp_opt_in: boolean | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          full_name: string
          id: string
          org_id: string
          password_display?: string | null
          phone?: string | null
          role: string
          whatsapp_opt_in?: boolean | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          org_id?: string
          password_display?: string | null
          phone?: string | null
          role?: string
          whatsapp_opt_in?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "users_department_fk"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          org_id: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          provider: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          org_id?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          provider: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          org_id?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_stats: {
        Args: { p_seven_ago: string; p_thirty_ago: string; p_today: string }
        Returns: {
          department_id: string
          dept_name: string
          dept_slug: string
          dept_sort_order: number
          last_report_date: string
          late_count_30: number
          late_count_7: number
          submitted_today: boolean
          today_ai_top_label: string
          today_ai_top_score: number
          today_report_id: string
          today_submitted_by: string
          total_reports_30: number
          total_reports_7: number
          unique_days_30: number
          unique_days_7: number
          warning_count_7: number
        }[]
      }
      get_user_org_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_org_member: { Args: { target_org_id: string }; Returns: boolean }
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
