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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      _internal_config: {
        Row: {
          created_at: string | null
          key: string
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          value?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          task_id: string | null
          type: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          task_id?: string | null
          type: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          task_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
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
          evaluation_enabled: boolean | null
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
          evaluation_enabled?: boolean | null
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
          evaluation_enabled?: boolean | null
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
      agent_levels: {
        Row: {
          description: string | null
          level: number
          name: string
          permissions: Json | null
        }
        Insert: {
          description?: string | null
          level: number
          name: string
          permissions?: Json | null
        }
        Update: {
          description?: string | null
          level?: number
          name?: string
          permissions?: Json | null
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
      agent_outputs: {
        Row: {
          id: string
          agent_name: string
          output_type: string
          title: string
          summary: string | null
          body: string | null
          entity_type: string | null
          entity_id: string | null
          external_id: string | null
          is_recurring: boolean
          is_actioned: boolean
          actioned_at: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_name: string
          output_type: string
          title: string
          summary?: string | null
          body?: string | null
          entity_type?: string | null
          entity_id?: string | null
          external_id?: string | null
          is_recurring?: boolean
          is_actioned?: boolean
          actioned_at?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_name?: string
          output_type?: string
          title?: string
          summary?: string | null
          body?: string | null
          entity_type?: string | null
          entity_id?: string | null
          external_id?: string | null
          is_recurring?: boolean
          is_actioned?: boolean
          actioned_at?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      agent_performance_reviews: {
        Row: {
          agent_id: string | null
          agent_name: string
          avg_quality_score: number | null
          created_at: string | null
          error_rate: number | null
          feedback: string | null
          id: string
          level_after: number | null
          level_before: number | null
          level_changed: boolean | null
          level_recommendation: string | null
          overall_rating: string | null
          review_period_end: string
          review_period_start: string
          reviewed_by: string | null
          revision_rate: number | null
          tasks_completed: number | null
          tasks_failed: number | null
        }
        Insert: {
          agent_id?: string | null
          agent_name: string
          avg_quality_score?: number | null
          created_at?: string | null
          error_rate?: number | null
          feedback?: string | null
          id?: string
          level_after?: number | null
          level_before?: number | null
          level_changed?: boolean | null
          level_recommendation?: string | null
          overall_rating?: string | null
          review_period_end: string
          review_period_start: string
          reviewed_by?: string | null
          revision_rate?: number | null
          tasks_completed?: number | null
          tasks_failed?: number | null
        }
        Update: {
          agent_id?: string | null
          agent_name?: string
          avg_quality_score?: number | null
          created_at?: string | null
          error_rate?: number | null
          feedback?: string | null
          id?: string
          level_after?: number | null
          level_before?: number | null
          level_changed?: boolean | null
          level_recommendation?: string | null
          overall_rating?: string | null
          review_period_end?: string
          review_period_start?: string
          reviewed_by?: string | null
          revision_rate?: number | null
          tasks_completed?: number | null
          tasks_failed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_performance_reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_registry: {
        Row: {
          business_id: string | null
          capabilities: Json | null
          color: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          full_documentation: string | null
          icon: string | null
          id: string
          level: number | null
          level_changed_at: string | null
          level_changed_reason: string | null
          name: string
          slug: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          capabilities?: Json | null
          color?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          full_documentation?: string | null
          icon?: string | null
          id?: string
          level?: number | null
          level_changed_at?: string | null
          level_changed_reason?: string | null
          name: string
          slug: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          capabilities?: Json | null
          color?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          full_documentation?: string | null
          icon?: string | null
          id?: string
          level?: number | null
          level_changed_at?: string | null
          level_changed_reason?: string | null
          name?: string
          slug?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_registry_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_registry_activity: {
        Row: {
          action_type: string
          agent_id: string | null
          created_at: string | null
          description: string | null
          details: Json | null
          id: string
        }
        Insert: {
          action_type: string
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
        }
        Update: {
          action_type?: string
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_registry_activity_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_registry_status: {
        Row: {
          agent_id: string | null
          current_task: string | null
          id: string
          metadata: Json | null
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          current_task?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          current_task?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_registry_status_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_registry"
            referencedColumns: ["id"]
          },
        ]
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
      agents: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_task_id: string | null
          id: string
          level: string
          name: string
          role: string
          session_key: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_task_id?: string | null
          id?: string
          level: string
          name: string
          role: string
          session_key?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_task_id?: string | null
          id?: string
          level?: string
          name?: string
          role?: string
          session_key?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_current_task_id_fkey"
            columns: ["current_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_response_logs: {
        Row: {
          business_id: string | null
          confidence_score: number | null
          contact_booked: boolean | null
          contact_id: string | null
          contact_opted_out: boolean | null
          contact_replied: boolean | null
          cost_cents: number | null
          created_at: string | null
          id: string
          input_channel: string | null
          input_message: string
          intents_detected: string[] | null
          knowledge_used: string[] | null
          model_used: string | null
          patterns_flagged: string[] | null
          required_review: boolean | null
          response_length: number | null
          response_text: string
          response_time_ms: number | null
          review_notes: string | null
          review_rating: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          tokens_used: number | null
        }
        Insert: {
          business_id?: string | null
          confidence_score?: number | null
          contact_booked?: boolean | null
          contact_id?: string | null
          contact_opted_out?: boolean | null
          contact_replied?: boolean | null
          cost_cents?: number | null
          created_at?: string | null
          id?: string
          input_channel?: string | null
          input_message: string
          intents_detected?: string[] | null
          knowledge_used?: string[] | null
          model_used?: string | null
          patterns_flagged?: string[] | null
          required_review?: boolean | null
          response_length?: number | null
          response_text: string
          response_time_ms?: number | null
          review_notes?: string | null
          review_rating?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tokens_used?: number | null
        }
        Update: {
          business_id?: string | null
          confidence_score?: number | null
          contact_booked?: boolean | null
          contact_id?: string | null
          contact_opted_out?: boolean | null
          contact_replied?: boolean | null
          cost_cents?: number | null
          created_at?: string | null
          id?: string
          input_channel?: string | null
          input_message?: string
          intents_detected?: string[] | null
          knowledge_used?: string[] | null
          model_used?: string | null
          patterns_flagged?: string[] | null
          required_review?: boolean | null
          response_length?: number | null
          response_text?: string
          response_time_ms?: number | null
          review_notes?: string | null
          review_rating?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_response_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_response_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_events: {
        Row: {
          acknowledged: boolean | null
          alert_id: string | null
          condition_snapshot: Json | null
          id: string
          triggered_at: string | null
          workflow_triggered: boolean | null
        }
        Insert: {
          acknowledged?: boolean | null
          alert_id?: string | null
          condition_snapshot?: Json | null
          id?: string
          triggered_at?: string | null
          workflow_triggered?: boolean | null
        }
        Update: {
          acknowledged?: boolean | null
          alert_id?: string | null
          condition_snapshot?: Json | null
          id?: string
          triggered_at?: string | null
          workflow_triggered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_events_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "investment_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_actions: {
        Row: {
          business_id: string
          confirmed_at: string | null
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          function_input: Json
          function_name: string
          function_output: Json | null
          id: string
          message_id: string | null
          required_confirmation: boolean | null
          status: string
          user_id: string
        }
        Insert: {
          business_id: string
          confirmed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          function_input: Json
          function_name: string
          function_output?: Json | null
          id?: string
          message_id?: string | null
          required_confirmation?: boolean | null
          status?: string
          user_id: string
        }
        Update: {
          business_id?: string
          confirmed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          function_input?: Json
          function_name?: string
          function_output?: Json | null
          id?: string
          message_id?: string | null
          required_confirmation?: boolean | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_actions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_actions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "assistant_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_conversations: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          tool_call_id: string | null
          tool_calls: Json | null
          tool_name: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          tool_call_id?: string | null
          tool_calls?: Json | null
          tool_name?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          tool_call_id?: string | null
          tool_calls?: Json | null
          tool_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_results: {
        Row: {
          client_communication_score: number | null
          company_name: string | null
          conditional_responses: Json | null
          contact_email: string
          contact_name: string
          converted_at: string | null
          created_at: string | null
          followup_attempted_at: string | null
          followup_error: string | null
          followup_sent_at: string | null
          form_id: string | null
          grade: string | null
          grade_label: string | null
          id: string
          lead_capture_score: number | null
          marketing_score: number | null
          operations_score: number | null
          raw_responses: Json | null
          sales_process_score: number | null
          source: string | null
          submitted_at: string | null
          total_score: number
          weakest_domain: string | null
        }
        Insert: {
          client_communication_score?: number | null
          company_name?: string | null
          conditional_responses?: Json | null
          contact_email: string
          contact_name: string
          converted_at?: string | null
          created_at?: string | null
          followup_attempted_at?: string | null
          followup_error?: string | null
          followup_sent_at?: string | null
          form_id?: string | null
          grade?: string | null
          grade_label?: string | null
          id?: string
          lead_capture_score?: number | null
          marketing_score?: number | null
          operations_score?: number | null
          raw_responses?: Json | null
          sales_process_score?: number | null
          source?: string | null
          submitted_at?: string | null
          total_score: number
          weakest_domain?: string | null
        }
        Update: {
          client_communication_score?: number | null
          company_name?: string | null
          conditional_responses?: Json | null
          contact_email?: string
          contact_name?: string
          converted_at?: string | null
          created_at?: string | null
          followup_attempted_at?: string | null
          followup_error?: string | null
          followup_sent_at?: string | null
          form_id?: string | null
          grade?: string | null
          grade_label?: string | null
          id?: string
          lead_capture_score?: number | null
          marketing_score?: number | null
          operations_score?: number | null
          raw_responses?: Json | null
          sales_process_score?: number | null
          source?: string | null
          submitted_at?: string | null
          total_score?: number
          weakest_domain?: string | null
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
      business_metrics_snapshots: {
        Row: {
          id: string
          snapshot_at: string
          metric_category: string
          metric_key: string
          metric_value: number | null
          metric_label: string | null
          status: string | null
          source_agent: string | null
          business_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          snapshot_at?: string
          metric_category: string
          metric_key: string
          metric_value?: number | null
          metric_label?: string | null
          status?: string | null
          source_agent?: string | null
          business_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          snapshot_at?: string
          metric_category?: string
          metric_key?: string
          metric_value?: number | null
          metric_label?: string | null
          status?: string | null
          source_agent?: string | null
          business_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_metrics_snapshots_business_id_fkey"
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
          investment_tier: string | null
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
          investment_tier?: string | null
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
          investment_tier?: string | null
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
      campaign_recipients: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string | null
          delivered_at: string | null
          email_id: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          message_sid: string | null
          personalized_message: string | null
          replied_at: string | null
          reply_message: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string | null
          delivered_at?: string | null
          email_id?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          message_sid?: string | null
          personalized_message?: string | null
          replied_at?: string | null
          reply_message?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string | null
          delivered_at?: string | null
          email_id?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          message_sid?: string | null
          personalized_message?: string | null
          replied_at?: string | null
          reply_message?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          business_id: string | null
          channel: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          message_template: string
          name: string
          started_at: string | null
          stats: Json | null
          status: string | null
          subject_template: string | null
          tags: string[] | null
          target_criteria: Json | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          channel: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          message_template: string
          name: string
          started_at?: string | null
          stats?: Json | null
          status?: string | null
          subject_template?: string | null
          tags?: string[] | null
          target_criteria?: Json | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          channel?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          message_template?: string
          name?: string
          started_at?: string | null
          stats?: Json | null
          status?: string | null
          subject_template?: string | null
          tags?: string[] | null
          target_criteria?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_business_id_fkey"
            columns: ["business_id"]
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
      client_assistant_config: {
        Row: {
          allowed_functions: string[] | null
          blocked_functions: string[] | null
          business_id: string
          created_at: string | null
          daily_limits: Json | null
          enabled: boolean | null
          id: string
          model: string | null
          require_confirmation: string[] | null
          system_prompt_additions: string | null
          updated_at: string | null
        }
        Insert: {
          allowed_functions?: string[] | null
          blocked_functions?: string[] | null
          business_id: string
          created_at?: string | null
          daily_limits?: Json | null
          enabled?: boolean | null
          id?: string
          model?: string | null
          require_confirmation?: string[] | null
          system_prompt_additions?: string | null
          updated_at?: string | null
        }
        Update: {
          allowed_functions?: string[] | null
          blocked_functions?: string[] | null
          business_id?: string
          created_at?: string | null
          daily_limits?: Json | null
          enabled?: boolean | null
          id?: string
          model?: string | null
          require_confirmation?: string[] | null
          system_prompt_additions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_assistant_config_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
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
      contact_follow_ups: {
        Row: {
          business_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          current_step: number | null
          enrolled_at: string | null
          id: string
          last_step_sent_at: string | null
          next_step_due_at: string | null
          pause_reason: string | null
          sequence_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          current_step?: number | null
          enrolled_at?: string | null
          id?: string
          last_step_sent_at?: string | null
          next_step_due_at?: string | null
          pause_reason?: string | null
          sequence_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          current_step?: number | null
          enrolled_at?: string | null
          id?: string
          last_step_sent_at?: string | null
          next_step_due_at?: string | null
          pause_reason?: string | null
          sequence_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_follow_ups_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_follow_ups_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_follow_ups_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "follow_up_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_message_log: {
        Row: {
          business_id: string
          channel: string
          contact_id: string
          direction: string
          id: string
          message_preview: string | null
          sent_at: string
        }
        Insert: {
          business_id: string
          channel?: string
          contact_id: string
          direction?: string
          id?: string
          message_preview?: string | null
          sent_at?: string
        }
        Update: {
          business_id?: string
          channel?: string
          contact_id?: string
          direction?: string
          id?: string
          message_preview?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_message_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_message_log_contact_id_fkey"
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
      crm_accounts: {
        Row: {
          id: string
          business_id: string
          name: string
          website: string | null
          industry: string | null
          company_size: string | null
          location: string | null
          linkedin_url: string | null
          description: string | null
          strategy_notes: string | null
          status: string
          owner_agent: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          website?: string | null
          industry?: string | null
          company_size?: string | null
          location?: string | null
          linkedin_url?: string | null
          description?: string | null
          strategy_notes?: string | null
          status?: string
          owner_agent?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          website?: string | null
          industry?: string | null
          company_size?: string | null
          location?: string | null
          linkedin_url?: string | null
          description?: string | null
          strategy_notes?: string | null
          status?: string
          owner_agent?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_deals: {
        Row: {
          id: string
          business_id: string
          account_id: string
          title: string
          stage: string
          value: number | null
          probability: number | null
          expected_close_date: string | null
          notes: string | null
          lost_reason: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          business_id: string
          account_id: string
          title: string
          stage?: string
          value?: number | null
          probability?: number | null
          expected_close_date?: string | null
          notes?: string | null
          lost_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          account_id?: string
          title?: string
          stage?: string
          value?: number | null
          probability?: number | null
          expected_close_date?: string | null
          notes?: string | null
          lost_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_interactions: {
        Row: {
          id: string
          business_id: string
          account_id: string
          deal_id: string | null
          type: string
          direction: string | null
          summary: string
          detail: string | null
          agent: string | null
          occurred_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          business_id: string
          account_id: string
          deal_id?: string | null
          type: string
          direction?: string | null
          summary: string
          detail?: string | null
          agent?: string | null
          occurred_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          account_id?: string
          deal_id?: string | null
          type?: string
          direction?: string | null
          summary?: string
          detail?: string | null
          agent?: string | null
          occurred_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      crm_documents: {
        Row: {
          id: string
          business_id: string
          account_id: string
          deal_id: string | null
          title: string
          type: string | null
          url: string
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          business_id: string
          account_id: string
          deal_id?: string | null
          title: string
          type?: string | null
          url: string
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          account_id?: string
          deal_id?: string | null
          title?: string
          type?: string | null
          url?: string
          uploaded_by?: string | null
          created_at?: string | null
        }
        Relationships: []
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
          email_last_contacted: string | null
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
          sms_last_contacted: string | null
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
          email_last_contacted?: string | null
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
          sms_last_contacted?: string | null
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
          email_last_contacted?: string | null
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
          sms_last_contacted?: string | null
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
      content_engagement_targets: {
        Row: {
          account_handle: string
          account_type: string | null
          best_times: string[] | null
          brand: string | null
          created_at: string | null
          engagement_count: number | null
          id: string
          is_active: boolean | null
          last_engaged: string | null
          notes: string | null
          platform: string
          priority: number | null
          timezone: string | null
          topic: string | null
        }
        Insert: {
          account_handle: string
          account_type?: string | null
          best_times?: string[] | null
          brand?: string | null
          created_at?: string | null
          engagement_count?: number | null
          id?: string
          is_active?: boolean | null
          last_engaged?: string | null
          notes?: string | null
          platform: string
          priority?: number | null
          timezone?: string | null
          topic?: string | null
        }
        Update: {
          account_handle?: string
          account_type?: string | null
          best_times?: string[] | null
          brand?: string | null
          created_at?: string | null
          engagement_count?: number | null
          id?: string
          is_active?: boolean | null
          last_engaged?: string | null
          notes?: string | null
          platform?: string
          priority?: number | null
          timezone?: string | null
          topic?: string | null
        }
        Relationships: []
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
      content_metrics: {
        Row: {
          bookmarks: number | null
          checked_at: string | null
          id: string
          impressions: number | null
          likes: number | null
          post_id: string | null
          quotes: number | null
          replies: number | null
          retweets: number | null
        }
        Insert: {
          bookmarks?: number | null
          checked_at?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          post_id?: string | null
          quotes?: number | null
          replies?: number | null
          retweets?: number | null
        }
        Update: {
          bookmarks?: number | null
          checked_at?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          post_id?: string | null
          quotes?: number | null
          replies?: number | null
          retweets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_pipeline: {
        Row: {
          account: string
          content: string
          content_type: string
          created_at: string | null
          engagement_type: string | null
          error_message: string | null
          generation_source: string | null
          id: string
          image_path: string | null
          platform: string
          post_url: string | null
          posted_at: string | null
          quality_checked_at: string | null
          quality_feedback: string | null
          quality_scores: Json | null
          retry_count: number | null
          scheduled_time: string | null
          status: string | null
          tags: string[] | null
          target_account: string | null
          target_url: string | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          account: string
          content: string
          content_type: string
          created_at?: string | null
          engagement_type?: string | null
          error_message?: string | null
          generation_source?: string | null
          id?: string
          image_path?: string | null
          platform: string
          post_url?: string | null
          posted_at?: string | null
          quality_checked_at?: string | null
          quality_feedback?: string | null
          quality_scores?: Json | null
          retry_count?: number | null
          scheduled_time?: string | null
          status?: string | null
          tags?: string[] | null
          target_account?: string | null
          target_url?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          account?: string
          content?: string
          content_type?: string
          created_at?: string | null
          engagement_type?: string | null
          error_message?: string | null
          generation_source?: string | null
          id?: string
          image_path?: string | null
          platform?: string
          post_url?: string | null
          posted_at?: string | null
          quality_checked_at?: string | null
          quality_feedback?: string | null
          quality_scores?: Json | null
          retry_count?: number | null
          scheduled_time?: string | null
          status?: string | null
          tags?: string[] | null
          target_account?: string | null
          target_url?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      content_posts: {
        Row: {
          account: string
          content_id: string
          content_text: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          platform: string
          posted_at: string | null
          url: string | null
        }
        Insert: {
          account: string
          content_id: string
          content_text?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          platform: string
          posted_at?: string | null
          url?: string | null
        }
        Update: {
          account?: string
          content_id?: string
          content_text?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          platform?: string
          posted_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      content_queue: {
        Row: {
          account: string | null
          advisor_feedback: Json | null
          advisor_score: number | null
          brand: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          image_urls: string[] | null
          pillar: string | null
          platform: string
          post_url: string | null
          posted_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          scheduled_time: string | null
          status: string | null
          style: string | null
          updated_at: string | null
        }
        Insert: {
          account?: string | null
          advisor_feedback?: Json | null
          advisor_score?: number | null
          brand: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_urls?: string[] | null
          pillar?: string | null
          platform: string
          post_url?: string | null
          posted_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          scheduled_time?: string | null
          status?: string | null
          style?: string | null
          updated_at?: string | null
        }
        Update: {
          account?: string | null
          advisor_feedback?: Json | null
          advisor_score?: number | null
          brand?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_urls?: string[] | null
          pillar?: string | null
          platform?: string
          post_url?: string | null
          posted_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          scheduled_time?: string | null
          status?: string | null
          style?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      content_schedule_rules: {
        Row: {
          account: string
          auto_generate: boolean | null
          best_times: string[] | null
          content_type: string
          created_at: string | null
          generation_prompt: string | null
          id: string
          is_active: boolean | null
          min_backlog_days: number | null
          platform: string
          posts_per_day: number | null
          target_backlog_days: number | null
          updated_at: string | null
        }
        Insert: {
          account: string
          auto_generate?: boolean | null
          best_times?: string[] | null
          content_type: string
          created_at?: string | null
          generation_prompt?: string | null
          id?: string
          is_active?: boolean | null
          min_backlog_days?: number | null
          platform: string
          posts_per_day?: number | null
          target_backlog_days?: number | null
          updated_at?: string | null
        }
        Update: {
          account?: string
          auto_generate?: boolean | null
          best_times?: string[] | null
          content_type?: string
          created_at?: string | null
          generation_prompt?: string | null
          id?: string
          is_active?: boolean | null
          min_backlog_days?: number | null
          platform?: string
          posts_per_day?: number | null
          target_backlog_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
      documents: {
        Row: {
          content: string | null
          created_at: string | null
          created_by_agent_id: string
          id: string
          task_id: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by_agent_id: string
          id?: string
          task_id?: string | null
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by_agent_id?: string
          id?: string
          task_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_agent_id_fkey"
            columns: ["created_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
      email_drip_queue: {
        Row: {
          completed: boolean | null
          contact_email: string
          contact_name: string | null
          created_at: string | null
          drip_stage: number | null
          id: string
          last_sent_at: string | null
          next_send_at: string | null
          pain_points: Json | null
          survey_response_id: string | null
        }
        Insert: {
          completed?: boolean | null
          contact_email: string
          contact_name?: string | null
          created_at?: string | null
          drip_stage?: number | null
          id?: string
          last_sent_at?: string | null
          next_send_at?: string | null
          pain_points?: Json | null
          survey_response_id?: string | null
        }
        Update: {
          completed?: boolean | null
          contact_email?: string
          contact_name?: string | null
          created_at?: string | null
          drip_stage?: number | null
          id?: string
          last_sent_at?: string | null
          next_send_at?: string | null
          pain_points?: Json | null
          survey_response_id?: string | null
        }
        Relationships: []
      }
      email_events: {
        Row: {
          created_at: string | null
          email_id: string | null
          event_type: string
          id: string
          message_id: string | null
          metadata: Json | null
          recipient: string | null
          timestamp: string | null
        }
        Insert: {
          created_at?: string | null
          email_id?: string | null
          event_type: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient?: string | null
          timestamp?: string | null
        }
        Update: {
          created_at?: string | null
          email_id?: string | null
          event_type?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient?: string | null
          timestamp?: string | null
        }
        Relationships: []
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
      email_replies: {
        Row: {
          body_html: string | null
          body_text: string | null
          business_id: string | null
          contact_id: string | null
          from_email: string
          from_name: string | null
          id: string
          notified: boolean | null
          original_campaign_id: string | null
          raw_payload: Json | null
          read_at: string | null
          received_at: string | null
          replied_at: string | null
          status: string | null
          subject: string | null
          to_email: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          business_id?: string | null
          contact_id?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          notified?: boolean | null
          original_campaign_id?: string | null
          raw_payload?: Json | null
          read_at?: string | null
          received_at?: string | null
          replied_at?: string | null
          status?: string | null
          subject?: string | null
          to_email: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          business_id?: string | null
          contact_id?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          notified?: boolean | null
          original_campaign_id?: string | null
          raw_payload?: Json | null
          read_at?: string | null
          received_at?: string | null
          replied_at?: string | null
          status?: string | null
          subject?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_replies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_replies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_replies_original_campaign_id_fkey"
            columns: ["original_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_replies_original_campaign_id_fkey"
            columns: ["original_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
          subject: string | null
          subscriber_id: string | null
          to_email: string | null
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
          subject?: string | null
          subscriber_id?: string | null
          to_email?: string | null
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
          subject?: string | null
          subscriber_id?: string | null
          to_email?: string | null
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
      fightflow_form_submissions: {
        Row: {
          alerted: boolean | null
          auto_responded: boolean | null
          auto_response_sent_at: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          message: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          subject: string | null
          submitted_at: string
          updated_at: string | null
          wix_contact_id: string
        }
        Insert: {
          alerted?: boolean | null
          auto_responded?: boolean | null
          auto_response_sent_at?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          message?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          subject?: string | null
          submitted_at: string
          updated_at?: string | null
          wix_contact_id: string
        }
        Update: {
          alerted?: boolean | null
          auto_responded?: boolean | null
          auto_response_sent_at?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          message?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          subject?: string | null
          submitted_at?: string
          updated_at?: string | null
          wix_contact_id?: string
        }
        Relationships: []
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
      follow_up_sequences: {
        Row: {
          business_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_sequences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_steps: {
        Row: {
          channel: string
          created_at: string | null
          delay_from: string | null
          delay_hours: number
          id: string
          message_template: string
          sequence_id: string | null
          step_order: number
          subject_template: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          delay_from?: string | null
          delay_hours?: number
          id?: string
          message_template: string
          sequence_id?: string | null
          step_order: number
          subject_template?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          delay_from?: string | null
          delay_hours?: number
          id?: string
          message_template?: string
          sequence_id?: string | null
          step_order?: number
          subject_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "follow_up_sequences"
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
      inbound_emails: {
        Row: {
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          created_at: string | null
          from_email: string
          from_name: string | null
          headers: Json | null
          id: string
          processed: boolean | null
          processed_at: string | null
          received_at: string | null
          subject: string | null
          to_email: string
        }
        Insert: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          from_email: string
          from_name?: string | null
          headers?: Json | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
          subject?: string | null
          to_email: string
        }
        Update: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          from_email?: string
          from_name?: string | null
          headers?: Json | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
          subject?: string | null
          to_email?: string
        }
        Relationships: []
      }
      investment_alerts: {
        Row: {
          asset_type: string
          business_id: string | null
          condition_json: Json
          cooldown_minutes: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string | null
          notification_config: Json | null
          symbol: string
          trigger_count: number | null
          user_id: string | null
          workflow_id: string | null
        }
        Insert: {
          asset_type: string
          business_id?: string | null
          condition_json: Json
          cooldown_minutes?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string | null
          notification_config?: Json | null
          symbol: string
          trigger_count?: number | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          asset_type?: string
          business_id?: string | null
          condition_json?: Json
          cooldown_minutes?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string | null
          notification_config?: Json | null
          symbol?: string
          trigger_count?: number | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_alerts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_subscriptions: {
        Row: {
          business_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          started_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          started_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          started_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_watchlist_items: {
        Row: {
          added_at: string | null
          alert_above: number | null
          alert_below: number | null
          id: string
          notes: string | null
          symbol: string
          target_price: number | null
          updated_at: string | null
          watchlist_id: string
        }
        Insert: {
          added_at?: string | null
          alert_above?: number | null
          alert_below?: number | null
          id?: string
          notes?: string | null
          symbol: string
          target_price?: number | null
          updated_at?: string | null
          watchlist_id: string
        }
        Update: {
          added_at?: string | null
          alert_above?: number | null
          alert_below?: number | null
          id?: string
          notes?: string | null
          symbol?: string
          target_price?: number | null
          updated_at?: string | null
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_watchlist_items_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "investment_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_watchlists: {
        Row: {
          business_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          symbols: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          symbols?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          symbols?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_watchlists_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      market_data_cache: {
        Row: {
          asset_type: string
          created_at: string
          data: Json
          expires_at: string
          fetched_at: string
          id: string
          symbol: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          data: Json
          expires_at: string
          fetched_at?: string
          id?: string
          symbol: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          data?: Json
          expires_at?: string
          fetched_at?: string
          id?: string
          symbol?: string
        }
        Relationships: []
      }
      market_data_refresh_log: {
        Row: {
          crypto_refreshed: number | null
          duration_ms: number | null
          errors: string[] | null
          id: string
          run_at: string | null
          stocks_refreshed: number | null
          symbols_refreshed: number | null
          total_requested: number | null
        }
        Insert: {
          crypto_refreshed?: number | null
          duration_ms?: number | null
          errors?: string[] | null
          id?: string
          run_at?: string | null
          stocks_refreshed?: number | null
          symbols_refreshed?: number | null
          total_requested?: number | null
        }
        Update: {
          crypto_refreshed?: number | null
          duration_ms?: number | null
          errors?: string[] | null
          id?: string
          run_at?: string | null
          stocks_refreshed?: number | null
          symbols_refreshed?: number | null
          total_requested?: number | null
        }
        Relationships: []
      }
      market_history_cache: {
        Row: {
          asset_type: string
          created_at: string
          data: Json
          days: number
          expires_at: string
          fetched_at: string
          id: string
          symbol: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          data: Json
          days?: number
          expires_at: string
          fetched_at?: string
          id?: string
          symbol: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          data?: Json
          days?: number
          expires_at?: string
          fetched_at?: string
          id?: string
          symbol?: string
        }
        Relationships: []
      }
      market_ohlcv_cache: {
        Row: {
          asset_type: string
          created_at: string
          data: Json
          days: number
          expires_at: string
          fetched_at: string
          id: string
          symbol: string
          updated_at: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          data: Json
          days: number
          expires_at: string
          fetched_at?: string
          id?: string
          symbol: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          data?: Json
          days?: number
          expires_at?: string
          fetched_at?: string
          id?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      mc_active_agent_tasks: {
        Row: {
          agent_id: string | null
          agent_name: string
          agent_type: string
          business_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          parent_agent_id: string | null
          progress: number | null
          started_at: string | null
          status: string | null
          task_description: string
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_name: string
          agent_type: string
          business_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parent_agent_id?: string | null
          progress?: number | null
          started_at?: string | null
          status?: string | null
          task_description: string
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_name?: string
          agent_type?: string
          business_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parent_agent_id?: string | null
          progress?: number | null
          started_at?: string | null
          status?: string | null
          task_description?: string
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mc_active_agent_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "mc_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_active_agent_tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_active_agent_tasks_parent_agent_id_fkey"
            columns: ["parent_agent_id"]
            isOneToOne: false
            referencedRelation: "mc_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_active_agent_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mc_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_activities: {
        Row: {
          agent_id: string | null
          business_id: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          task_id: string | null
          type: Database["public"]["Enums"]["mc_activity_type"]
        }
        Insert: {
          agent_id?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          task_id?: string | null
          type: Database["public"]["Enums"]["mc_activity_type"]
        }
        Update: {
          agent_id?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          task_id?: string | null
          type?: Database["public"]["Enums"]["mc_activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "mc_activities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "mc_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mc_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_agents: {
        Row: {
          avatar_url: string | null
          business_id: string | null
          created_at: string
          current_task_id: string | null
          id: string
          level: Database["public"]["Enums"]["mc_agent_level"]
          level_description: string | null
          name: string
          role: string
          scope: string | null
          session_key: string | null
          status: Database["public"]["Enums"]["mc_agent_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_id?: string | null
          created_at?: string
          current_task_id?: string | null
          id?: string
          level?: Database["public"]["Enums"]["mc_agent_level"]
          level_description?: string | null
          name: string
          role: string
          scope?: string | null
          session_key?: string | null
          status?: Database["public"]["Enums"]["mc_agent_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_id?: string | null
          created_at?: string
          current_task_id?: string | null
          id?: string
          level?: Database["public"]["Enums"]["mc_agent_level"]
          level_description?: string | null
          name?: string
          role?: string
          scope?: string | null
          session_key?: string | null
          status?: Database["public"]["Enums"]["mc_agent_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_agent_current_task"
            columns: ["current_task_id"]
            isOneToOne: false
            referencedRelation: "mc_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_agents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_analytics: {
        Row: {
          agent_id: string | null
          business_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          metric_category: string
          metric_name: string
          metric_unit: string | null
          metric_value: number | null
          period_end: string | null
          period_start: string | null
        }
        Insert: {
          agent_id?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_category: string
          metric_name: string
          metric_unit?: string | null
          metric_value?: number | null
          period_end?: string | null
          period_start?: string | null
        }
        Update: {
          agent_id?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_category?: string
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number | null
          period_end?: string | null
          period_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mc_analytics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "mc_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_analytics_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
          current_value: number | null
          id: string
          message: string | null
          metric_name: string
          previous_level: string | null
          threshold_level: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          message?: string | null
          metric_name: string
          previous_level?: string | null
          threshold_level: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          message?: string | null
          metric_name?: string
          previous_level?: string | null
          threshold_level?: string
        }
        Relationships: []
      }
      mc_analytics_thresholds: {
        Row: {
          created_at: string | null
          description: string | null
          green_max: number | null
          green_min: number | null
          id: string
          metric_name: string
          red_max: number | null
          red_min: number | null
          updated_at: string | null
          yellow_max: number | null
          yellow_min: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          green_max?: number | null
          green_min?: number | null
          id?: string
          metric_name: string
          red_max?: number | null
          red_min?: number | null
          updated_at?: string | null
          yellow_max?: number | null
          yellow_min?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          green_max?: number | null
          green_min?: number | null
          id?: string
          metric_name?: string
          red_max?: number | null
          red_min?: number | null
          updated_at?: string | null
          yellow_max?: number | null
          yellow_min?: number | null
        }
        Relationships: []
      }
      mc_health_reports: {
        Row: {
          created_at: string | null
          green_count: number | null
          id: string
          red_count: number | null
          report: Json
          summary: string | null
          yellow_count: number | null
        }
        Insert: {
          created_at?: string | null
          green_count?: number | null
          id?: string
          red_count?: number | null
          report: Json
          summary?: string | null
          yellow_count?: number | null
        }
        Update: {
          created_at?: string | null
          green_count?: number | null
          id?: string
          red_count?: number | null
          report?: Json
          summary?: string | null
          yellow_count?: number | null
        }
        Relationships: []
      }
      mc_instructions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          parsed_intent: string | null
          raw_text: string
          source: string
          source_message_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          parsed_intent?: string | null
          raw_text: string
          source: string
          source_message_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          parsed_intent?: string | null
          raw_text?: string
          source?: string
          source_message_id?: string | null
        }
        Relationships: []
      }
      mc_messages: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string
          from_agent_id: string | null
          id: string
          task_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string
          from_agent_id?: string | null
          id?: string
          task_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string
          from_agent_id?: string | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mc_messages_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "mc_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mc_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_notifications: {
        Row: {
          content: string
          created_at: string | null
          delivered: boolean | null
          delivered_at: string | null
          from_agent_id: string | null
          id: string
          mentioned_agent_id: string | null
          message_id: string | null
          source_type: string
          task_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          delivered?: boolean | null
          delivered_at?: string | null
          from_agent_id?: string | null
          id?: string
          mentioned_agent_id?: string | null
          message_id?: string | null
          source_type: string
          task_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          delivered?: boolean | null
          delivered_at?: string | null
          from_agent_id?: string | null
          id?: string
          mentioned_agent_id?: string | null
          message_id?: string | null
          source_type?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mc_notifications_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "mc_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_notifications_mentioned_agent_id_fkey"
            columns: ["mentioned_agent_id"]
            isOneToOne: false
            referencedRelation: "mc_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mc_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mc_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_logs: {
        Row: {
          id: string
          agent: string | null
          event_type: string | null
          label: string | null
          status: string | null
          details: string | null
          business_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent?: string | null
          event_type?: string | null
          label?: string | null
          status?: string | null
          details?: string | null
          business_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent?: string | null
          event_type?: string | null
          label?: string | null
          status?: string | null
          details?: string | null
          business_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_reports: {
        Row: {
          business_id: string | null
          content: string
          created_at: string
          id: string
          metadata: Json | null
          title: string
          type: Database["public"]["Enums"]["mc_report_type"]
        }
        Insert: {
          business_id?: string | null
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          title: string
          type: Database["public"]["Enums"]["mc_report_type"]
        }
        Update: {
          business_id?: string | null
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["mc_report_type"]
        }
        Relationships: [
          {
            foreignKeyName: "mc_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_task_subscriptions: {
        Row: {
          agent_id: string | null
          id: string
          subscribed_at: string | null
          task_id: string | null
        }
        Insert: {
          agent_id?: string | null
          id?: string
          subscribed_at?: string | null
          task_id?: string | null
        }
        Update: {
          agent_id?: string | null
          id?: string
          subscribed_at?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mc_task_subscriptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "mc_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_task_subscriptions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mc_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_tasks: {
        Row: {
          assignee_ids: string[] | null
          business_id: string | null
          created_at: string
          description: string | null
          document_url: string | null
          external_id: string | null
          external_source: string | null
          id: string
          instruction_id: string | null
          priority: Database["public"]["Enums"]["mc_task_priority"]
          status: Database["public"]["Enums"]["mc_task_status"]
          tags: string[] | null
          title: string
          updated_at: string
          work_summary: string | null
        }
        Insert: {
          assignee_ids?: string[] | null
          business_id?: string | null
          created_at?: string
          description?: string | null
          document_url?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          instruction_id?: string | null
          priority?: Database["public"]["Enums"]["mc_task_priority"]
          status?: Database["public"]["Enums"]["mc_task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          work_summary?: string | null
        }
        Update: {
          assignee_ids?: string[] | null
          business_id?: string | null
          created_at?: string
          description?: string | null
          document_url?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          instruction_id?: string | null
          priority?: Database["public"]["Enums"]["mc_task_priority"]
          status?: Database["public"]["Enums"]["mc_task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          work_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mc_tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_tasks_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "mc_instructions"
            referencedColumns: ["id"]
          },
        ]
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
      message_approval_queue: {
        Row: {
          business_id: string | null
          channel: string
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          expires_at: string | null
          flags: string[] | null
          id: string
          last_message_direction: string | null
          message_body: string
          message_type: string | null
          recent_message_count: number | null
          recipient_email: string | null
          recipient_phone: string | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          business_id?: string | null
          channel: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          flags?: string[] | null
          id?: string
          last_message_direction?: string | null
          message_body: string
          message_type?: string | null
          recent_message_count?: number | null
          recipient_email?: string | null
          recipient_phone?: string | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          business_id?: string | null
          channel?: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          flags?: string[] | null
          id?: string
          last_message_direction?: string | null
          message_body?: string
          message_type?: string | null
          recent_message_count?: number | null
          recipient_email?: string | null
          recipient_phone?: string | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_approval_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_approval_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string | null
          from_agent_id: string
          id: string
          task_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string | null
          from_agent_id: string
          id?: string
          task_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string | null
          from_agent_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          delivered: boolean
          from_agent_id: string | null
          id: string
          mentioned_agent_id: string
          task_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          delivered?: boolean
          from_agent_id?: string | null
          id?: string
          mentioned_agent_id: string
          task_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          delivered?: boolean
          from_agent_id?: string | null
          id?: string
          mentioned_agent_id?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_mentioned_agent_id_fkey"
            columns: ["mentioned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_policy: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      outbound_message_queue: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          business_id: string
          created_at: string | null
          id: string
          message_type: string
          metadata: Json | null
          recipient_contact: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body: string
          business_id: string
          created_at?: string | null
          id?: string
          message_type: string
          metadata?: Json | null
          recipient_contact: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          business_id?: string
          created_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          recipient_contact?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_message_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_log: {
        Row: {
          content: string | null
          id: number
          opened_at: string | null
          prospect_id: number | null
          replied_at: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          template_used: string | null
          type: string
        }
        Insert: {
          content?: string | null
          id?: number
          opened_at?: string | null
          prospect_id?: number | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_used?: string | null
          type: string
        }
        Update: {
          content?: string | null
          id?: number
          opened_at?: string | null
          prospect_id?: number | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_used?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_log_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      process_monitors: {
        Row: {
          id: string
          process_name: string
          display_name: string
          category: string | null
          owner_agent: string | null
          server_name: string | null
          schedule_description: string | null
          last_status: string | null
          last_run_at: string | null
          next_run_at: string | null
          consecutive_errors: number
          error_message: string | null
          is_active: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          process_name: string
          display_name: string
          category?: string | null
          owner_agent?: string | null
          server_name?: string | null
          schedule_description?: string | null
          last_status?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          consecutive_errors?: number
          error_message?: string | null
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          process_name?: string
          display_name?: string
          category?: string | null
          owner_agent?: string | null
          server_name?: string | null
          schedule_description?: string | null
          last_status?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          consecutive_errors?: number
          error_message?: string | null
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          id: number
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      service_requests: {
        Row: {
          id: string
          business_id: string | null
          contact_id: string | null
          title: string
          description: string | null
          request_type: string
          status: string
          priority: string
          created_at: string
          updated_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          contact_id?: string | null
          title: string
          description?: string | null
          request_type?: string
          status?: string
          priority?: string
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string | null
          contact_id?: string | null
          title?: string
          description?: string | null
          request_type?: string
          status?: string
          priority?: string
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_activities: {
        Row: {
          activity_type: string
          agent_id: string | null
          company_name: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          prospect_name: string | null
        }
        Insert: {
          activity_type: string
          agent_id?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          prospect_name?: string | null
        }
        Update: {
          activity_type?: string
          agent_id?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          prospect_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_activities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "mc_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_conversations: {
        Row: {
          budget_signals: string | null
          contact_id: string | null
          created_at: string | null
          current_tools: string | null
          id: string
          last_touch: string | null
          next_action: string | null
          pain_points: string | null
          stage: string | null
          updated_at: string | null
        }
        Insert: {
          budget_signals?: string | null
          contact_id?: string | null
          created_at?: string | null
          current_tools?: string | null
          id?: string
          last_touch?: string | null
          next_action?: string | null
          pain_points?: string | null
          stage?: string | null
          updated_at?: string | null
        }
        Update: {
          budget_signals?: string | null
          contact_id?: string | null
          created_at?: string | null
          current_tools?: string | null
          id?: string
          last_touch?: string | null
          next_action?: string | null
          pain_points?: string | null
          stage?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_daily_metrics: {
        Row: {
          agent_id: string | null
          calls_made: number | null
          created_at: string | null
          date: string
          emails_sent: number | null
          id: string
          meetings_booked: number | null
          notes: string | null
          outreach_drafted: number | null
          prospects_researched: number | null
          responses_received: number | null
          sms_sent: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          calls_made?: number | null
          created_at?: string | null
          date?: string
          emails_sent?: number | null
          id?: string
          meetings_booked?: number | null
          notes?: string | null
          outreach_drafted?: number | null
          prospects_researched?: number | null
          responses_received?: number | null
          sms_sent?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          calls_made?: number | null
          created_at?: string | null
          date?: string
          emails_sent?: number | null
          id?: string
          meetings_booked?: number | null
          notes?: string | null
          outreach_drafted?: number | null
          prospects_researched?: number | null
          responses_received?: number | null
          sms_sent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_daily_metrics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "mc_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_metrics: {
        Row: {
          cold_emails_sent: number | null
          created_at: string | null
          date: string
          follow_ups_sent: number | null
          id: number
          meetings_booked: number | null
          opens: number | null
          prospects_added: number | null
          replies: number | null
        }
        Insert: {
          cold_emails_sent?: number | null
          created_at?: string | null
          date: string
          follow_ups_sent?: number | null
          id?: number
          meetings_booked?: number | null
          opens?: number | null
          prospects_added?: number | null
          replies?: number | null
        }
        Update: {
          cold_emails_sent?: number | null
          created_at?: string | null
          date?: string
          follow_ups_sent?: number | null
          id?: number
          meetings_booked?: number | null
          opens?: number | null
          prospects_added?: number | null
          replies?: number | null
        }
        Relationships: []
      }
      sales_prospects: {
        Row: {
          annual_revenue: string | null
          city: string | null
          company: string | null
          company_address: string | null
          company_city: string | null
          company_country: string | null
          company_linkedin: string | null
          company_name_emails: string | null
          company_state: string | null
          corporate_phone: string | null
          country: string | null
          created_at: string | null
          departments: string | null
          email: string | null
          email_status: string | null
          employee_count: number | null
          facebook_url: string | null
          first_name: string | null
          id: string
          imported_at: string | null
          industry: string | null
          keywords: string | null
          last_contacted_at: string | null
          last_name: string | null
          last_raised_at: string | null
          latest_funding: string | null
          latest_funding_amount: string | null
          linkedin_url: string | null
          mobile_phone: string | null
          notes: string | null
          secondary_email: string | null
          seniority: string | null
          seo_description: string | null
          source: string | null
          source_sheet: string | null
          state: string | null
          status: string | null
          tags: string[] | null
          technologies: string | null
          tertiary_email: string | null
          title: string | null
          total_funding: string | null
          twitter_url: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          annual_revenue?: string | null
          city?: string | null
          company?: string | null
          company_address?: string | null
          company_city?: string | null
          company_country?: string | null
          company_linkedin?: string | null
          company_name_emails?: string | null
          company_state?: string | null
          corporate_phone?: string | null
          country?: string | null
          created_at?: string | null
          departments?: string | null
          email?: string | null
          email_status?: string | null
          employee_count?: number | null
          facebook_url?: string | null
          first_name?: string | null
          id?: string
          imported_at?: string | null
          industry?: string | null
          keywords?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          last_raised_at?: string | null
          latest_funding?: string | null
          latest_funding_amount?: string | null
          linkedin_url?: string | null
          mobile_phone?: string | null
          notes?: string | null
          secondary_email?: string | null
          seniority?: string | null
          seo_description?: string | null
          source?: string | null
          source_sheet?: string | null
          state?: string | null
          status?: string | null
          tags?: string[] | null
          technologies?: string | null
          tertiary_email?: string | null
          title?: string | null
          total_funding?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          annual_revenue?: string | null
          city?: string | null
          company?: string | null
          company_address?: string | null
          company_city?: string | null
          company_country?: string | null
          company_linkedin?: string | null
          company_name_emails?: string | null
          company_state?: string | null
          corporate_phone?: string | null
          country?: string | null
          created_at?: string | null
          departments?: string | null
          email?: string | null
          email_status?: string | null
          employee_count?: number | null
          facebook_url?: string | null
          first_name?: string | null
          id?: string
          imported_at?: string | null
          industry?: string | null
          keywords?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          last_raised_at?: string | null
          latest_funding?: string | null
          latest_funding_amount?: string | null
          linkedin_url?: string | null
          mobile_phone?: string | null
          notes?: string | null
          secondary_email?: string | null
          seniority?: string | null
          seo_description?: string | null
          source?: string | null
          source_sheet?: string | null
          state?: string | null
          status?: string | null
          tags?: string[] | null
          technologies?: string | null
          tertiary_email?: string | null
          title?: string | null
          total_funding?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
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
      scheduled_posts: {
        Row: {
          account: string
          business_id: string | null
          content: string
          created_at: string | null
          error_message: string | null
          id: string
          media_urls: Json | null
          platform: string
          post_id: string | null
          posted_at: string | null
          scheduled_at: string
          status: string
          updated_at: string | null
        }
        Insert: {
          account: string
          business_id?: string | null
          content: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          media_urls?: Json | null
          platform?: string
          post_id?: string | null
          posted_at?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          account?: string
          business_id?: string | null
          content?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          media_urls?: Json | null
          platform?: string
          post_id?: string | null
          posted_at?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      screener_profiles: {
        Row: {
          asset_types: string[]
          business_id: string | null
          created_at: string
          description: string | null
          id: string
          is_preset: boolean
          logic: string
          name: string
          rules: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          asset_types?: string[]
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_preset?: boolean
          logic?: string
          name: string
          rules?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          asset_types?: string[]
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_preset?: boolean
          logic?: string
          name?: string
          rules?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screener_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_message_queue: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_id: string | null
          channel: string
          contact_id: string | null
          created_at: string | null
          error_message: string | null
          follow_up_id: string | null
          id: string
          message: string
          recipient: string
          sent_at: string | null
          status: string | null
          step_order: number | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string | null
          channel: string
          contact_id?: string | null
          created_at?: string | null
          error_message?: string | null
          follow_up_id?: string | null
          id?: string
          message: string
          recipient: string
          sent_at?: string | null
          status?: string | null
          step_order?: number | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string | null
          channel?: string
          contact_id?: string | null
          created_at?: string | null
          error_message?: string | null
          follow_up_id?: string | null
          id?: string
          message?: string
          recipient?: string
          sent_at?: string | null
          status?: string | null
          step_order?: number | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_message_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_message_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_message_queue_follow_up_id_fkey"
            columns: ["follow_up_id"]
            isOneToOne: false
            referencedRelation: "contact_follow_ups"
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
      sparkwave_booking_requests: {
        Row: {
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          notes: string | null
          phone: string | null
          preferred_date: string
          preferred_time: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          preferred_date: string
          preferred_time: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_date?: string
          preferred_time?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      sparkwave_survey_responses: {
        Row: {
          biggest_headache: string | null
          budget_range: string | null
          company_name: string
          contact_email: string
          contact_name: string
          created_at: string | null
          current_tools: string | null
          hours_on_repetitive_tasks: string | null
          id: string
          ip_address: string | null
          notes: string | null
          processed: boolean | null
          source: string | null
          timeline: string | null
          user_agent: string | null
        }
        Insert: {
          biggest_headache?: string | null
          budget_range?: string | null
          company_name: string
          contact_email: string
          contact_name: string
          created_at?: string | null
          current_tools?: string | null
          hours_on_repetitive_tasks?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          processed?: boolean | null
          source?: string | null
          timeline?: string | null
          user_agent?: string | null
        }
        Update: {
          biggest_headache?: string | null
          budget_range?: string | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          created_at?: string | null
          current_tools?: string | null
          hours_on_repetitive_tasks?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          processed?: boolean | null
          source?: string | null
          timeline?: string | null
          user_agent?: string | null
        }
        Relationships: []
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
      survey_drip_status: {
        Row: {
          completed: boolean | null
          contact_id: string
          created_at: string | null
          drip_day14_sent_at: string | null
          drip_day2_sent_at: string | null
          drip_day5_sent_at: string | null
          drip_day9_sent_at: string | null
          id: string
          survey_completed_at: string
          tier: string
          unsubscribed: boolean | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          contact_id: string
          created_at?: string | null
          drip_day14_sent_at?: string | null
          drip_day2_sent_at?: string | null
          drip_day5_sent_at?: string | null
          drip_day9_sent_at?: string | null
          id?: string
          survey_completed_at: string
          tier: string
          unsubscribed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          contact_id?: string
          created_at?: string | null
          drip_day14_sent_at?: string | null
          drip_day2_sent_at?: string | null
          drip_day5_sent_at?: string | null
          drip_day9_sent_at?: string | null
          id?: string
          survey_completed_at?: string
          tier?: string
          unsubscribed?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_drip_status_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_ids: string[] | null
          created_at: string | null
          description: string | null
          external_id: string | null
          external_source: string | null
          id: string
          priority: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee_ids?: string[] | null
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          priority?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee_ids?: string[] | null
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          priority?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tenant_config: {
        Row: {
          branding: Json | null
          business_id: string
          created_at: string
          enabled_modules: Json | null
          id: string
          notifications: Json | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          branding?: Json | null
          business_id: string
          created_at?: string
          enabled_modules?: Json | null
          id?: string
          notifications?: Json | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          branding?: Json | null
          business_id?: string
          created_at?: string
          enabled_modules?: Json | null
          id?: string
          notifications?: Json | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_config_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
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
      twitter_engagement: {
        Row: {
          created_at: string | null
          engagement_rate: number | null
          id: string
          impressions: number | null
          likes: number | null
          link_clicks: number | null
          poll_interval: string | null
          polled_at: string
          post_id: string | null
          profile_clicks: number | null
          quotes: number | null
          replies: number | null
          retweets: number | null
        }
        Insert: {
          created_at?: string | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          link_clicks?: number | null
          poll_interval?: string | null
          polled_at: string
          post_id?: string | null
          profile_clicks?: number | null
          quotes?: number | null
          replies?: number | null
          retweets?: number | null
        }
        Update: {
          created_at?: string | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          link_clicks?: number | null
          poll_interval?: string | null
          polled_at?: string
          post_id?: string | null
          profile_clicks?: number | null
          quotes?: number | null
          replies?: number | null
          retweets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "twitter_engagement_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "twitter_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      twitter_posts: {
        Row: {
          account: string
          content: string
          created_at: string | null
          criteria_scores: Json | null
          has_image: boolean | null
          id: string
          image_url: string | null
          passed_first_time: boolean | null
          post_type: string | null
          posted_at: string | null
          reply_to_url: string | null
          revision_count: number | null
          tweet_id: string | null
        }
        Insert: {
          account: string
          content: string
          created_at?: string | null
          criteria_scores?: Json | null
          has_image?: boolean | null
          id?: string
          image_url?: string | null
          passed_first_time?: boolean | null
          post_type?: string | null
          posted_at?: string | null
          reply_to_url?: string | null
          revision_count?: number | null
          tweet_id?: string | null
        }
        Update: {
          account?: string
          content?: string
          created_at?: string | null
          criteria_scores?: Json | null
          has_image?: boolean | null
          id?: string
          image_url?: string | null
          passed_first_time?: boolean | null
          post_type?: string | null
          posted_at?: string | null
          reply_to_url?: string | null
          revision_count?: number | null
          tweet_id?: string | null
        }
        Relationships: []
      }
      twitter_scheduled: {
        Row: {
          account: string
          content: string
          created_at: string | null
          error_message: string | null
          id: string
          scheduled_for: string
          status: string | null
          tweet_id: string | null
          updated_at: string | null
        }
        Insert: {
          account: string
          content: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          scheduled_for: string
          status?: string | null
          tweet_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account?: string
          content?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          scheduled_for?: string
          status?: string | null
          tweet_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
      watchlist_items: {
        Row: {
          added_at: string | null
          asset_type: string
          id: string
          notes: string | null
          symbol: string
          watchlist_id: string | null
        }
        Insert: {
          added_at?: string | null
          asset_type: string
          id?: string
          notes?: string | null
          symbol: string
          watchlist_id?: string | null
        }
        Update: {
          added_at?: string | null
          asset_type?: string
          id?: string
          notes?: string | null
          symbol?: string
          watchlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_items_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "investment_watchlists"
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
      webhook_submissions: {
        Row: {
          business_id: string
          id: string
          processed_at: string | null
          submission_id: string
        }
        Insert: {
          business_id: string
          id?: string
          processed_at?: string | null
          submission_id: string
        }
        Update: {
          business_id?: string
          id?: string
          processed_at?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_submissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          actions_executed: string[] | null
          error: string | null
          executed_at: string | null
          id: string
          payload: Json | null
          success: boolean
          trigger_type: string
          workflow_id: string | null
        }
        Insert: {
          actions_executed?: string[] | null
          error?: string | null
          executed_at?: string | null
          id?: string
          payload?: Json | null
          success: boolean
          trigger_type: string
          workflow_id?: string | null
        }
        Update: {
          actions_executed?: string[] | null
          error?: string | null
          executed_at?: string | null
          id?: string
          payload?: Json | null
          success?: boolean
          trigger_type?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          actions: Json
          business_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actions?: Json
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actions?: Json
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      campaign_summary: {
        Row: {
          business_id: string | null
          channel: string | null
          completed_at: string | null
          created_at: string | null
          delivered_count: number | null
          delivery_rate: number | null
          failed_count: number | null
          id: string | null
          message_template: string | null
          name: string | null
          opted_out_count: number | null
          replied_count: number | null
          reply_rate: number | null
          sent_count: number | null
          started_at: string | null
          status: string | null
          tags: string[] | null
          total_recipients: number | null
        }
        Insert: {
          business_id?: string | null
          channel?: string | null
          completed_at?: string | null
          created_at?: string | null
          delivered_count?: never
          delivery_rate?: never
          failed_count?: never
          id?: string | null
          message_template?: string | null
          name?: string | null
          opted_out_count?: never
          replied_count?: never
          reply_rate?: never
          sent_count?: never
          started_at?: string | null
          status?: string | null
          tags?: string[] | null
          total_recipients?: never
        }
        Update: {
          business_id?: string | null
          channel?: string | null
          completed_at?: string | null
          created_at?: string | null
          delivered_count?: never
          delivery_rate?: never
          failed_count?: never
          id?: string | null
          message_template?: string | null
          name?: string | null
          opted_out_count?: never
          replied_count?: never
          reply_rate?: never
          sent_count?: never
          started_at?: string | null
          status?: string | null
          tags?: string[] | null
          total_recipients?: never
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      content_performance: {
        Row: {
          account: string | null
          bookmarks: number | null
          content_id: string | null
          content_text: string | null
          engagement_score: number | null
          id: string | null
          impressions: number | null
          last_checked: string | null
          likes: number | null
          platform: string | null
          posted_at: string | null
          quotes: number | null
          replies: number | null
          retweets: number | null
          url: string | null
        }
        Relationships: []
      }
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
      can_message_contact: {
        Args: {
          p_channel?: string
          p_contact_id: string
          p_min_hours_between?: number
        }
        Returns: boolean
      }
      cleanup_stale_agent_tasks: {
        Args: { stale_threshold_hours?: number }
        Returns: number
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
      count_alerts: {
        Args: { p_business_id?: string; p_user_id: string }
        Returns: number
      }
      count_campaign_recipients: {
        Args: { p_campaign_id: string }
        Returns: number
      }
      count_watchlist_items: {
        Args: { p_business_id?: string; p_user_id: string }
        Returns: number
      }
      count_watchlists: {
        Args: { p_business_id?: string; p_user_id: string }
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
      evaluate_metric_threshold: {
        Args: { p_metric_name: string; p_value: number }
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
          email_last_contacted: string | null
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
          sms_last_contacted: string | null
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
      get_investment_tier: {
        Args: { p_business_id: string; p_user_id: string }
        Returns: string
      }
      get_pending_survey_drips: {
        Args: { p_limit?: number }
        Returns: {
          contact_id: string
          drip_id: string
          email: string
          first_name: string
          magic_wand: string
          pain_points: Json
          pending_drip_day: number
          survey_completed_at: string
          tier: string
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
      increment_trigger_count: { Args: { alert_id: string }; Returns: number }
      is_business_admin: {
        Args: { p_business_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      mark_drip_sent: {
        Args: { p_day: number; p_drip_id: string }
        Returns: undefined
      }
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
      refresh_market_data: { Args: never; Returns: undefined }
      refresh_tag_counts: {
        Args: { p_business_id: string }
        Returns: undefined
      }
      run_alert_evaluation: { Args: never; Returns: undefined }
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
      upsert_agent_status: {
        Args: {
          p_agent_id: string
          p_current_task?: string
          p_metadata?: Json
          p_status: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "business_admin"
        | "content_manager"
        | "content_creator"
        | "viewer"
      business_permission_level: "admin" | "manager" | "creator" | "viewer"
      mc_activity_type:
        | "task_created"
        | "task_updated"
        | "status_changed"
        | "message_sent"
        | "decision_made"
        | "document_created"
      mc_agent_level: "lead" | "specialist" | "intern"
      mc_agent_status: "working" | "idle" | "blocked"
      mc_report_type:
        | "hourly_summary"
        | "health_check"
        | "weekly_report"
        | "activity_log"
        | "daily_summary"
      mc_task_priority: "critical" | "high" | "medium" | "low"
      mc_task_status: "inbox" | "assigned" | "in_progress" | "review" | "done" | "todo" | "blocked" | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
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
      mc_activity_type: [
        "task_created",
        "task_updated",
        "status_changed",
        "message_sent",
        "decision_made",
        "document_created",
      ],
      mc_agent_level: ["lead", "specialist", "intern"],
      mc_agent_status: ["working", "idle", "blocked"],
      mc_report_type: [
        "hourly_summary",
        "health_check",
        "weekly_report",
        "activity_log",
        "daily_summary",
      ],
      mc_task_priority: ["critical", "high", "medium", "low"],
      mc_task_status: ["inbox", "assigned", "in_progress", "review", "done", "todo", "blocked", "cancelled"],
    },
  },
} as const
