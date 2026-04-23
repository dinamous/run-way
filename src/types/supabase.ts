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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          client_id: string | null
          created_at: string | null
          entity: string
          entity_id: string
          entity_name: string | null
          field: string | null
          from_value: string | null
          id: string
          to_value: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          client_id?: string | null
          created_at?: string | null
          entity: string
          entity_id: string
          entity_name?: string | null
          field?: string | null
          from_value?: string | null
          id?: string
          to_value?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          client_id?: string | null
          created_at?: string | null
          entity?: string
          entity_id?: string
          entity_name?: string | null
          field?: string | null
          from_value?: string | null
          id?: string
          to_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          access_role: string | null
          auth_user_id: string | null
          avatar: string
          avatar_url: string | null
          created_at: string
          deactivated_at: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          role: string
        }
        Insert: {
          access_role?: string | null
          auth_user_id?: string | null
          avatar: string
          avatar_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          role: string
        }
        Update: {
          access_role?: string | null
          auth_user_id?: string | null
          avatar?: string
          avatar_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          role?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          client_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      step_assignees: {
        Row: {
          member_id: string
          step_id: string
        }
        Insert: {
          member_id: string
          step_id: string
        }
        Update: {
          member_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_assignees_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_assignees_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "task_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      task_steps: {
        Row: {
          active: boolean
          end_date: string | null
          id: string
          start_date: string | null
          step_order: number
          task_id: string
          type: string
        }
        Insert: {
          active?: boolean
          end_date?: string | null
          id?: string
          start_date?: string | null
          step_order: number
          task_id: string
          type: string
        }
        Update: {
          active?: boolean
          end_date?: string | null
          id?: string
          start_date?: string | null
          step_order?: number
          task_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          blocked: boolean
          blocked_at: string | null
          clickup_link: string | null
          client_id: string | null
          concluded_at: string | null
          concluded_by: string | null
          created_at: string
          id: string
          title: string
        }
        Insert: {
          blocked?: boolean
          blocked_at?: string | null
          clickup_link?: string | null
          client_id?: string | null
          concluded_at?: string | null
          concluded_by?: string | null
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          blocked?: boolean
          blocked_at?: string | null
          clickup_link?: string | null
          client_id?: string | null
          concluded_at?: string | null
          concluded_by?: string | null
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_clients: {
        Row: {
          client_id: string
          user_id: string
        }
        Insert: {
          client_id: string
          user_id: string
        }
        Update: {
          client_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          client_order: string[]
          created_at: string
          default_view: string
          id: string
          language: string
          notification_member_overloaded: boolean
          notification_step_overdue: boolean
          notification_task_stalled: boolean
          notifications_enabled: boolean
          overload_threshold: number
          stalled_days_threshold: number
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_order?: string[]
          created_at?: string
          default_view?: string
          id?: string
          language?: string
          notification_member_overloaded?: boolean
          notification_step_overdue?: boolean
          notification_task_stalled?: boolean
          notifications_enabled?: boolean
          overload_threshold?: number
          stalled_days_threshold?: number
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_order?: string[]
          created_at?: string
          default_view?: string
          id?: string
          language?: string
          notification_member_overloaded?: boolean
          notification_step_overdue?: boolean
          notification_task_stalled?: boolean
          notifications_enabled?: boolean
          overload_threshold?: number
          stalled_days_threshold?: number
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_client_ids: { Args: never; Returns: string[] }
      has_recent_audit_activity: {
        Args: { since_hours?: number }
        Returns: boolean
      }
      notify_overdue_steps: { Args: never; Returns: undefined }
      notify_overloaded_members: { Args: never; Returns: undefined }
      notify_stalled_tasks: { Args: never; Returns: undefined }
      run_notification_checks: { Args: never; Returns: undefined }
      send_notification: {
        Args: {
          p_client_id: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: undefined
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
