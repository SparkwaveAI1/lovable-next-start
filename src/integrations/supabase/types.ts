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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agent_actions: {
        Row: {
          created_at: string
          description: string | null
          error_count: number | null
          id: string
          last_executed: string | null
          name: string
          parameters: Json | null
          project_id: string | null
          status: string | null
          success_count: number | null
          tags: string[] | null
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          error_count?: number | null
          id?: string
          last_executed?: string | null
          name: string
          parameters?: Json | null
          project_id?: string | null
          status?: string | null
          success_count?: number | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          error_count?: number | null
          id?: string
          last_executed?: string | null
          name?: string
          parameters?: Json | null
          project_id?: string | null
          status?: string | null
          success_count?: number | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_config: {
        Row: {
          agent_name: string | null
          auto_reply_enabled: boolean | null
          booking_enabled: boolean | null
          business_hours: Json | null
          business_id: string
          created_at: string | null
          email_greeting_body: string | null
          email_greeting_subject: string | null
          fallback_message: string | null
          from_email: string | null
          from_name: string | null
          greeting_message: string | null
          id: string
          max_response_length: number | null
          model: string | null
          notification_emails: string[] | null
          personality_prompt: string | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          agent_name?: string | null
          auto_reply_enabled?: boolean | null
          booking_enabled?: boolean | null
          business_hours?: Json | null
          business_id: string
          created_at?: string | null
          email_greeting_body?: string | null
          email_greeting_subject?: string | null
          fallback_message?: string | null
          from_email?: string | null
          from_name?: string | null
          greeting_message?: string | null
          id?: string
          max_response_length?: number | null
          model?: string | null
          notification_emails?: string[] | null
          personality_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_name?: string | null
          auto_reply_enabled?: boolean | null
          booking_enabled?: boolean | null
          business_hours?: Json | null
          business_id?: string
          created_at?: string | null
          email_greeting_body?: string | null
          email_greeting_subject?: string | null
          fallback_message?: string | null
          from_email?: string | null
          from_name?: string | null
          greeting_message?: string | null
          id?: string
          max_response_length?: number | null
          model?: string | null
          notification_emails?: string[] | null
          personality_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_config_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_configurations: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          knowledge_base: string | null
          system_prompt: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          knowledge_base?: string | null
          system_prompt: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          knowledge_base?: string | null
          system_prompt?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_configurations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          project_id: string | null
          tags: string[] | null
          timestamp: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          tags?: string[] | null
          timestamp?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          tags?: string[] | null
          timestamp?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_triggers: {
        Row: {
          action_id: string | null
          condition: string
          created_at: string
          description: string | null
          event_name: string | null
          id: string
          is_active: boolean | null
          is_enabled: boolean | null
          last_triggered: string | null
          name: string
          project_id: string | null
          tags: string[] | null
          type: string | null
          updated_at: string
        }
        Insert: {
          action_id?: string | null
          condition: string
          created_at?: string
          description?: string | null
          event_name?: string | null
          id?: string
          is_active?: boolean | null
          is_enabled?: boolean | null
          last_triggered?: string | null
          name: string
          project_id?: string | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          action_id?: string | null
          condition?: string
          created_at?: string
          description?: string | null
          event_name?: string | null
          id?: string
          is_active?: boolean | null
          is_enabled?: boolean | null
          last_triggered?: string | null
          name?: string
          project_id?: string | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          automation_type: string
          business_id: string
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          processed_data: Json | null
          sms_direction: string | null
          sms_from: string | null
          sms_to: string | null
          source_data: Json | null
          status: string
        }
        Insert: {
          automation_type: string
          business_id: string
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          processed_data?: Json | null
          sms_direction?: string | null
          sms_from?: string | null
          sms_to?: string | null
          source_data?: Json | null
          status: string
        }
        Update: {
          automation_type?: string
          business_id?: string
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          processed_data?: Json | null
          sms_direction?: string | null
          sms_from?: string | null
          sms_to?: string | null
          source_data?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_knowledge: {
        Row: {
          business_id: string
          category: string
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          priority: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          category: string
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_knowledge_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_permissions: {
        Row: {
          business_id: string
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          permission_level: Database["public"]["Enums"]["business_permission_level"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_level?: Database["public"]["Enums"]["business_permission_level"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_level?: Database["public"]["Enums"]["business_permission_level"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_permissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          business_type: string
          created_at: string
          description: string | null
          game_twitter_token: string | null
          id: string
          late_facebook_account_id: string | null
          late_instagram_account_id: string | null
          late_linkedin_account_id: string | null
          late_profile_id: string | null
          late_tiktok_account_id: string | null
          late_twitter_account_id: string | null
          name: string
          parent_business_id: string | null
          slug: string
          status: string | null
          updated_at: string
        }
        Insert: {
          business_type: string
          created_at?: string
          description?: string | null
          game_twitter_token?: string | null
          id?: string
          late_facebook_account_id?: string | null
          late_instagram_account_id?: string | null
          late_linkedin_account_id?: string | null
          late_profile_id?: string | null
          late_tiktok_account_id?: string | null
          late_twitter_account_id?: string | null
          name: string
          parent_business_id?: string | null
          slug: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          business_type?: string
          created_at?: string
          description?: string | null
          game_twitter_token?: string | null
          id?: string
          late_facebook_account_id?: string | null
          late_instagram_account_id?: string | null
          late_linkedin_account_id?: string | null
          late_profile_id?: string | null
          late_tiktok_account_id?: string | null
          late_twitter_account_id?: string | null
          name?: string
          parent_business_id?: string | null
          slug?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_parent_business_id_fkey"
            columns: ["parent_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      class_bookings: {
        Row: {
          booking_date: string | null
          class_schedule_id: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          status: string | null
        }
        Insert: {
          booking_date?: string | null
          class_schedule_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
        }
        Update: {
          booking_date?: string | null
          class_schedule_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_bookings_class_schedule_id_fkey"
            columns: ["class_schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedule: {
        Row: {
          business_id: string | null
          class_name: string | null
          created_at: string | null
          day_of_week: number | null
          end_time: string | null
          id: string
          instructor: string | null
          is_active: boolean | null
          max_capacity: number | null
          start_time: string | null
        }
        Insert: {
          business_id?: string | null
          class_name?: string | null
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          instructor?: string | null
          is_active?: boolean | null
          max_capacity?: number | null
          start_time?: string | null
        }
        Update: {
          business_id?: string | null
          class_name?: string | null
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          instructor?: string | null
          is_active?: boolean | null
          max_capacity?: number | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_schedule_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          contact_id: string
          created_at: string | null
          id: string
          notes: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          contact_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_segments: {
        Row: {
          business_id: string
          created_at: string | null
          description: string | null
          filters: Json
          id: string
          is_active: boolean | null
          last_computed_at: string | null
          last_computed_count: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_active?: boolean | null
          last_computed_at?: string | null
          last_computed_count?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_active?: boolean | null
          last_computed_at?: string | null
          last_computed_count?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_segments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          business_id: string
          color: string | null
          contact_count: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          color?: string | null
          contact_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          color?: string | null
          contact_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          business_id: string | null
          comments: string | null
          created_at: string | null
          email: string | null
          email_status: string | null
          first_name: string | null
          id: string
          interested_programs: string[] | null
          last_activity_date: string | null
          last_name: string | null
          lead_type: string | null
          lifetime_value: number | null
          metadata: Json | null
          next_follow_up_date: string | null
          phone: string | null
          pipeline_stage: string | null
          preferred_channel: string | null
          sms_status: string | null
          source: string | null
          status: string | null
          status_notes: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          comments?: string | null
          created_at?: string | null
          email?: string | null
          email_status?: string | null
          first_name?: string | null
          id?: string
          interested_programs?: string[] | null
          last_activity_date?: string | null
          last_name?: string | null
          lead_type?: string | null
          lifetime_value?: number | null
          metadata?: Json | null
          next_follow_up_date?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          preferred_channel?: string | null
          sms_status?: string | null
          source?: string | null
          status?: string | null
          status_notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          comments?: string | null
          created_at?: string | null
          email?: string | null
          email_status?: string | null
          first_name?: string | null
          id?: string
          interested_programs?: string[] | null
          last_activity_date?: string | null
          last_name?: string | null
          lead_type?: string | null
          lifetime_value?: number | null
          metadata?: Json | null
          next_follow_up_date?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          preferred_channel?: string | null
          sms_status?: string | null
          source?: string | null
          status?: string | null
          status_notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      content_media: {
        Row: {
          content_id: string
          created_at: string | null
          display_order: number | null
          id: string
          media_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          media_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          media_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_media_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "scheduled_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_state: {
        Row: {
          business_id: string
          contact_phone: string
          conversation_context: Json | null
          created_at: string | null
          id: string
          last_message_at: string | null
          status: string | null
        }
        Insert: {
          business_id: string
          contact_phone: string
          conversation_context?: Json | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string | null
        }
        Update: {
          business_id?: string
          contact_phone?: string
          conversation_context?: Json | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_state_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_threads: {
        Row: {
          business_id: string | null
          contact_id: string | null
          context: Json | null
          conversation_state: string | null
          created_at: string | null
          id: string
          intent_history: Json | null
          last_activity: string | null
          last_bot_message_at: string | null
          needs_human_review: boolean | null
          state_data: Json | null
          status: string | null
        }
        Insert: {
          business_id?: string | null
          contact_id?: string | null
          context?: Json | null
          conversation_state?: string | null
          created_at?: string | null
          id?: string
          intent_history?: Json | null
          last_activity?: string | null
          last_bot_message_at?: string | null
          needs_human_review?: boolean | null
          state_data?: Json | null
          status?: string | null
        }
        Update: {
          business_id?: string | null
          contact_id?: string | null
          context?: Json | null
          conversation_state?: string | null
          created_at?: string | null
          id?: string
          intent_history?: Json | null
          last_activity?: string | null
          last_bot_message_at?: string | null
          needs_human_review?: boolean | null
          state_data?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_threads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_threads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_indicators: {
        Row: {
          created_at: string | null
          id: string
          indicator_key: string
          indicator_name: string
          last_updated: string | null
          reading_date: string | null
          source: string | null
          unit: string | null
          value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          indicator_key: string
          indicator_name: string
          last_updated?: string | null
          reading_date?: string | null
          source?: string | null
          unit?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          indicator_key?: string
          indicator_name?: string
          last_updated?: string | null
          reading_date?: string | null
          source?: string | null
          unit?: string | null
          value?: number | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          business_id: string
          content_html: string
          content_text: string | null
          created_at: string | null
          from_email: string
          from_name: string
          id: string
          list_id: string | null
          name: string
          preview_text: string | null
          reply_to: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string
          target_filters: Json | null
          target_segment_id: string | null
          target_tags: string[] | null
          target_tags_match: string | null
          target_type: string | null
          total_bounced: number | null
          total_clicked: number | null
          total_complained: number | null
          total_delivered: number | null
          total_opened: number | null
          total_recipients: number | null
          total_sent: number | null
          total_unsubscribed: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          content_html: string
          content_text?: string | null
          created_at?: string | null
          from_email: string
          from_name: string
          id?: string
          list_id?: string | null
          name: string
          preview_text?: string | null
          reply_to?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          target_filters?: Json | null
          target_segment_id?: string | null
          target_tags?: string[] | null
          target_tags_match?: string | null
          target_type?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_complained?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          total_unsubscribed?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          content_html?: string
          content_text?: string | null
          created_at?: string | null
          from_email?: string
          from_name?: string
          id?: string
          list_id?: string | null
          name?: string
          preview_text?: string | null
          reply_to?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          target_filters?: Json | null
          target_segment_id?: string | null
          target_tags?: string[] | null
          target_tags_match?: string | null
          target_type?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_complained?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          total_unsubscribed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_target_segment_id_fkey"
            columns: ["target_segment_id"]
            isOneToOne: false
            referencedRelation: "contact_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      email_clicks: {
        Row: {
          clicked_at: string | null
          id: string
          ip_address: unknown
          send_id: string
          url: string
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string | null
          id?: string
          ip_address?: unknown
          send_id: string
          url: string
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string | null
          id?: string
          ip_address?: unknown
          send_id?: string
          url?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_clicks_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_list_members: {
        Row: {
          added_at: string | null
          id: string
          list_id: string
          subscriber_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          list_id: string
          subscriber_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          list_id?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_list_members_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "email_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_lists: {
        Row: {
          business_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          subscriber_count: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subscriber_count?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subscriber_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_lists_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number | null
          campaign_id: string
          contact_id: string
          created_at: string | null
          email: string
          error_message: string | null
          first_name: string | null
          id: string
          last_name: string | null
          max_attempts: number | null
          next_retry_at: string | null
          processed_at: string | null
          resend_id: string | null
          status: string | null
        }
        Insert: {
          attempts?: number | null
          campaign_id: string
          contact_id: string
          created_at?: string | null
          email: string
          error_message?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          processed_at?: string | null
          resend_id?: string | null
          status?: string | null
        }
        Update: {
          attempts?: number | null
          campaign_id?: string
          contact_id?: string
          created_at?: string | null
          email?: string
          error_message?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          processed_at?: string | null
          resend_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          bounce_type: string | null
          bounced_at: string | null
          campaign_id: string | null
          clicked_at: string | null
          contact_id: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          resend_id: string | null
          sent_at: string | null
          status: string | null
          subscriber_id: string | null
        }
        Insert: {
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string | null
          subscriber_id?: string | null
        }
        Update: {
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string | null
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "email_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_subscribers: {
        Row: {
          business_id: string
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          metadata: Json | null
          source: string | null
          status: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_subscribers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_config: {
        Row: {
          business_id: string | null
          created_at: string | null
          first_follow_up_hours: number | null
          first_follow_up_message: string | null
          id: string
          is_enabled: boolean | null
          max_follow_ups: number | null
          second_follow_up_hours: number | null
          second_follow_up_message: string | null
          third_follow_up_hours: number | null
          third_follow_up_message: string | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          first_follow_up_hours?: number | null
          first_follow_up_message?: string | null
          id?: string
          is_enabled?: boolean | null
          max_follow_ups?: number | null
          second_follow_up_hours?: number | null
          second_follow_up_message?: string | null
          third_follow_up_hours?: number | null
          third_follow_up_message?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          first_follow_up_hours?: number | null
          first_follow_up_message?: string | null
          id?: string
          is_enabled?: boolean | null
          max_follow_ups?: number | null
          second_follow_up_hours?: number | null
          second_follow_up_message?: string | null
          third_follow_up_hours?: number | null
          third_follow_up_message?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_config_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_tweets: {
        Row: {
          business_id: string | null
          content: string
          created_at: string | null
          engagement_data: Json | null
          id: string
          image_urls: string[] | null
          posted_at: string | null
          scheduled_for: string | null
          session_id: string | null
          status: string | null
        }
        Insert: {
          business_id?: string | null
          content: string
          created_at?: string | null
          engagement_data?: Json | null
          id?: string
          image_urls?: string[] | null
          posted_at?: string | null
          scheduled_for?: string | null
          session_id?: string | null
          status?: string | null
        }
        Update: {
          business_id?: string | null
          content?: string
          created_at?: string | null
          engagement_data?: Json | null
          id?: string
          image_urls?: string[] | null
          posted_at?: string | null
          scheduled_for?: string | null
          session_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_tweets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_tweets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "twitter_content_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_configurations: {
        Row: {
          api_key: string | null
          business_id: string
          created_at: string
          id: string
          is_active: boolean | null
          location_id: string
          pipeline_id: string
          stage_id: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          location_id: string
          pipeline_id: string
          stage_id: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          location_id?: string
          pipeline_id?: string
          stage_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          business_id: string
          created_at: string | null
          description: string | null
          duration: number | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          height: number | null
          id: string
          mime_type: string | null
          tags: string[] | null
          thumbnail_path: string | null
          uploaded_at: string | null
          width: number | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          height?: number | null
          id?: string
          mime_type?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          uploaded_at?: string | null
          width?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          uploaded_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      rejected_content: {
        Row: {
          business_id: string
          content: string
          created_at: string | null
          generation_params: Json | null
          id: string
          keywords: string[] | null
          platform: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string
          tags: string[] | null
          topic: string | null
        }
        Insert: {
          business_id: string
          content: string
          created_at?: string | null
          generation_params?: Json | null
          id?: string
          keywords?: string[] | null
          platform: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason: string
          tags?: string[] | null
          topic?: string | null
        }
        Update: {
          business_id?: string
          content?: string
          created_at?: string | null
          generation_params?: Json | null
          id?: string
          keywords?: string[] | null
          platform?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string
          tags?: string[] | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rejected_content_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_content: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          business_id: string | null
          content: string
          content_hash: string | null
          content_type: string
          created_at: string | null
          error_message: string | null
          id: string
          keywords: string[] | null
          metadata: Json | null
          platform: string
          posted_at: string | null
          rejection_reason: string | null
          scheduled_for: string | null
          status: string | null
          tags: string[] | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string | null
          content: string
          content_hash?: string | null
          content_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          keywords?: string[] | null
          metadata?: Json | null
          platform: string
          posted_at?: string | null
          rejection_reason?: string | null
          scheduled_for?: string | null
          status?: string | null
          tags?: string[] | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string | null
          content?: string
          content_hash?: string | null
          content_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          keywords?: string[] | null
          metadata?: Json | null
          platform?: string
          posted_at?: string | null
          rejection_reason?: string | null
          scheduled_for?: string | null
          status?: string | null
          tags?: string[] | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_content_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_config: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          phone_number: string | null
          provider: string | null
          welcome_message: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number?: string | null
          provider?: string | null
          welcome_message?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number?: string | null
          provider?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_config_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          ai_response: boolean | null
          contact_id: string | null
          created_at: string | null
          direction: string | null
          id: string
          message: string | null
          thread_id: string | null
        }
        Insert: {
          ai_response?: boolean | null
          contact_id?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          message?: string | null
          thread_id?: string | null
        }
        Update: {
          ai_response?: boolean | null
          contact_id?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          message?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      staged_content: {
        Row: {
          business_id: string
          content: string
          content_type: string
          created_at: string | null
          id: string
          platform: string
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          content: string
          content_type: string
          created_at?: string | null
          id?: string
          platform: string
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          content?: string
          content_type?: string
          created_at?: string | null
          id?: string
          platform?: string
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staged_content_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      staging_media: {
        Row: {
          display_order: number | null
          id: string
          media_id: string
          paired_at: string | null
          staged_content_id: string
        }
        Insert: {
          display_order?: number | null
          id?: string
          media_id: string
          paired_at?: string | null
          staged_content_id: string
        }
        Update: {
          display_order?: number | null
          id?: string
          media_id?: string
          paired_at?: string | null
          staged_content_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staging_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staging_media_staged_content_id_fkey"
            columns: ["staged_content_id"]
            isOneToOne: false
            referencedRelation: "staged_content"
            referencedColumns: ["id"]
          },
        ]
      }
      token_alert_preferences: {
        Row: {
          alert_email: string | null
          alert_enabled: boolean | null
          check_frequency_hours: number | null
          created_at: string | null
          id: string
          updated_at: string | null
          warning_days_before_expiry: number | null
        }
        Insert: {
          alert_email?: string | null
          alert_enabled?: boolean | null
          check_frequency_hours?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          warning_days_before_expiry?: number | null
        }
        Update: {
          alert_email?: string | null
          alert_enabled?: boolean | null
          check_frequency_hours?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          warning_days_before_expiry?: number | null
        }
        Relationships: []
      }
      token_health_checks: {
        Row: {
          business_id: string
          check_timestamp: string
          created_at: string | null
          days_until_expiry: number | null
          error_message: string | null
          id: string
          platform: string
          status: string
          test_post_attempted: boolean | null
          test_post_successful: boolean | null
          token_expires_at: string | null
        }
        Insert: {
          business_id: string
          check_timestamp?: string
          created_at?: string | null
          days_until_expiry?: number | null
          error_message?: string | null
          id?: string
          platform: string
          status: string
          test_post_attempted?: boolean | null
          test_post_successful?: boolean | null
          token_expires_at?: string | null
        }
        Update: {
          business_id?: string
          check_timestamp?: string
          created_at?: string | null
          days_until_expiry?: number | null
          error_message?: string | null
          id?: string
          platform?: string
          status?: string
          test_post_attempted?: boolean | null
          test_post_successful?: boolean | null
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_health_checks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      twitter_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          message_type: string | null
          metadata: Json | null
          session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "twitter_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "twitter_content_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      twitter_content_sessions: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          session_name: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          session_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          session_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "twitter_content_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      verified_senders: {
        Row: {
          business_id: string
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verified_senders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          business_id: string
          created_at: string | null
          endpoint_slug: string
          id: string
          is_active: boolean | null
          secret_key: string
          webhook_type: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          endpoint_slug: string
          id?: string
          is_active?: boolean | null
          secret_key: string
          webhook_type: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          endpoint_slug?: string
          id?: string
          is_active?: boolean | null
          secret_key?: string
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      latest_token_health: {
        Row: {
          business_id: string | null
          check_timestamp: string | null
          days_until_expiry: number | null
          error_message: string | null
          id: string | null
          platform: string | null
          status: string | null
          test_post_attempted: boolean | null
          test_post_successful: boolean | null
          token_expires_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_health_checks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_business: {
        Args: { p_business_id: string; p_user_id?: string }
        Returns: boolean
      }
      clear_campaign_queue: { Args: { p_campaign_id: string }; Returns: number }
      compute_segment_count: { Args: { p_segment_id: string }; Returns: number }
      contact_add_tag: {
        Args: { p_contact_id: string; p_tag: string }
        Returns: undefined
      }
      contact_remove_tag: {
        Args: { p_contact_id: string; p_tag: string }
        Returns: undefined
      }
      contact_touch: { Args: { p_contact_id: string }; Returns: undefined }
      count_campaign_recipients: {
        Args: { p_campaign_id: string }
        Returns: number
      }
      create_contact_tag: {
        Args: {
          p_business_id: string
          p_color?: string
          p_description?: string
          p_name: string
        }
        Returns: string
      }
      find_or_create_contact: {
        Args: {
          p_business_id: string
          p_email?: string
          p_first_name?: string
          p_last_name?: string
          p_phone?: string
          p_source?: string
          p_status?: string
        }
        Returns: {
          contact_id: string
          is_new: boolean
          matched_by: string
        }[]
      }
      get_campaign_recipients: {
        Args: { p_campaign_id: string }
        Returns: {
          contact_id: string
          email: string
          first_name: string
          last_name: string
        }[]
      }
      get_contacts_by_tags: {
        Args: {
          p_business_id: string
          p_email_status?: string
          p_tags: string[]
        }
        Returns: {
          business_id: string | null
          comments: string | null
          created_at: string | null
          email: string | null
          email_status: string | null
          first_name: string | null
          id: string
          interested_programs: string[] | null
          last_activity_date: string | null
          last_name: string | null
          lead_type: string | null
          lifetime_value: number | null
          metadata: Json | null
          next_follow_up_date: string | null
          phone: string | null
          pipeline_stage: string | null
          preferred_channel: string | null
          sms_status: string | null
          source: string | null
          status: string | null
          status_notes: string | null
          tags: string[] | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "contacts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_email_queue_batch: {
        Args: { p_batch_size?: number; p_campaign_id: string }
        Returns: {
          contact_id: string
          email: string
          first_name: string
          last_name: string
          queue_id: string
        }[]
      }
      get_queue_progress: {
        Args: { p_campaign_id: string }
        Returns: {
          failed: number
          pending: number
          percent_complete: number
          processing: number
          sent: number
          skipped: number
          total: number
        }[]
      }
      get_user_business_permission: {
        Args: { p_business_id: string; p_user_id?: string }
        Returns: Database["public"]["Enums"]["business_permission_level"]
      }
      get_user_email_by_id: { Args: { p_user_id: string }; Returns: string }
      get_user_id_by_email: { Args: { user_email: string }; Returns: string }
      grant_business_permission_by_email: {
        Args: {
          p_business_id: string
          p_permission_level: Database["public"]["Enums"]["business_permission_level"]
          user_email: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_campaign_stat: {
        Args: { p_campaign_id: string; p_stat: string }
        Returns: undefined
      }
      is_business_admin: {
        Args: { p_business_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      mark_queue_failed: {
        Args: {
          p_error_message?: string
          p_queue_id: string
          p_should_retry?: boolean
        }
        Returns: undefined
      }
      mark_queue_sent: {
        Args: { p_queue_id: string; p_resend_id?: string }
        Returns: undefined
      }
      preview_campaign_recipients: {
        Args: { p_campaign_id: string; p_limit?: number }
        Returns: {
          contact_id: string
          email: string
          first_name: string
          last_name: string
        }[]
      }
      queue_campaign_emails: {
        Args: { p_campaign_id: string }
        Returns: number
      }
      refresh_tag_counts: {
        Args: { p_business_id: string }
        Returns: undefined
      }
      search_business_knowledge: {
        Args: { p_business_id: string; p_limit?: number; p_query: string }
        Returns: {
          category: string
          content: string
          id: string
          relevance_score: number
          title: string
        }[]
      }
      set_default_sender: { Args: { p_sender_id: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "business_admin"
        | "content_manager"
        | "content_creator"
        | "viewer"
      business_permission_level: "admin" | "manager" | "creator" | "viewer"
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
        "business_admin",
        "content_manager",
        "content_creator",
        "viewer",
      ],
      business_permission_level: ["admin", "manager", "creator", "viewer"],
    },
  },
} as const
