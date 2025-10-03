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
      businesses: {
        Row: {
          business_type: string
          created_at: string
          description: string | null
          id: string
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
          id?: string
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
          id?: string
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
      contacts: {
        Row: {
          business_id: string | null
          comments: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          interested_programs: string[] | null
          last_activity_date: string | null
          last_name: string | null
          lead_type: string | null
          next_follow_up_date: string | null
          phone: string | null
          pipeline_stage: string | null
          source: string | null
          status: string | null
          status_notes: string | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          comments?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          interested_programs?: string[] | null
          last_activity_date?: string | null
          last_name?: string | null
          lead_type?: string | null
          next_follow_up_date?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          source?: string | null
          status?: string | null
          status_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          comments?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          interested_programs?: string[] | null
          last_activity_date?: string | null
          last_name?: string | null
          lead_type?: string | null
          next_follow_up_date?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          source?: string | null
          status?: string | null
          status_notes?: string | null
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
          created_at: string | null
          id: string
          last_activity: string | null
          status: string | null
        }
        Insert: {
          business_id?: string | null
          contact_id?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          last_activity?: string | null
          status?: string | null
        }
        Update: {
          business_id?: string | null
          contact_id?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          last_activity?: string | null
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
      scheduled_content: {
        Row: {
          business_id: string | null
          content: string
          content_type: string
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          platform: string
          posted_at: string | null
          scheduled_for: string
          status: string | null
          topic: string | null
        }
        Insert: {
          business_id?: string | null
          content: string
          content_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          platform: string
          posted_at?: string | null
          scheduled_for: string
          status?: string | null
          topic?: string | null
        }
        Update: {
          business_id?: string | null
          content?: string
          content_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          platform?: string
          posted_at?: string | null
          scheduled_for?: string
          status?: string | null
          topic?: string | null
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
          account_sid: string | null
          auth_token: string | null
          business_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          phone_number: string | null
          provider: string | null
          welcome_message: string | null
        }
        Insert: {
          account_sid?: string | null
          auth_token?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number?: string | null
          provider?: string | null
          welcome_message?: string | null
        }
        Update: {
          account_sid?: string | null
          auth_token?: string | null
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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
