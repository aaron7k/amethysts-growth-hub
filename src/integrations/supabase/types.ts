export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accelerator_checklist_progress: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_completed: boolean | null
          notes: string | null
          stage_number: number
          subscription_id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          stage_number: number
          subscription_id: string
          template_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          stage_number?: number
          subscription_id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accelerator_checklist_progress_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "accelerator_stage_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      accelerator_onboarding_checklist: {
        Row: {
          academy_access_granted: boolean | null
          academy_access_granted_at: string | null
          academy_access_granted_by: string | null
          client_id: string
          completed_at: string | null
          contract_sent: boolean | null
          contract_sent_at: string | null
          contract_sent_by: string | null
          created_at: string
          discord_groups_created: boolean | null
          discord_groups_created_at: string | null
          discord_groups_created_by: string | null
          document_sent: boolean | null
          document_sent_at: string | null
          document_sent_by: string | null
          highlevel_subccount_created: boolean | null
          highlevel_subccount_created_at: string | null
          highlevel_subccount_created_by: string | null
          id: string
          is_completed: boolean | null
          notes: string | null
          onboarding_meeting_scheduled: boolean | null
          onboarding_meeting_scheduled_at: string | null
          onboarding_meeting_scheduled_by: string | null
          subscription_id: string
          updated_at: string
        }
        Insert: {
          academy_access_granted?: boolean | null
          academy_access_granted_at?: string | null
          academy_access_granted_by?: string | null
          client_id: string
          completed_at?: string | null
          contract_sent?: boolean | null
          contract_sent_at?: string | null
          contract_sent_by?: string | null
          created_at?: string
          discord_groups_created?: boolean | null
          discord_groups_created_at?: string | null
          discord_groups_created_by?: string | null
          document_sent?: boolean | null
          document_sent_at?: string | null
          document_sent_by?: string | null
          highlevel_subccount_created?: boolean | null
          highlevel_subccount_created_at?: string | null
          highlevel_subccount_created_by?: string | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          onboarding_meeting_scheduled?: boolean | null
          onboarding_meeting_scheduled_at?: string | null
          onboarding_meeting_scheduled_by?: string | null
          subscription_id: string
          updated_at?: string
        }
        Update: {
          academy_access_granted?: boolean | null
          academy_access_granted_at?: string | null
          academy_access_granted_by?: string | null
          client_id?: string
          completed_at?: string | null
          contract_sent?: boolean | null
          contract_sent_at?: string | null
          contract_sent_by?: string | null
          created_at?: string
          discord_groups_created?: boolean | null
          discord_groups_created_at?: string | null
          discord_groups_created_by?: string | null
          document_sent?: boolean | null
          document_sent_at?: string | null
          document_sent_by?: string | null
          highlevel_subccount_created?: boolean | null
          highlevel_subccount_created_at?: string | null
          highlevel_subccount_created_by?: string | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          onboarding_meeting_scheduled?: boolean | null
          onboarding_meeting_scheduled_at?: string | null
          onboarding_meeting_scheduled_by?: string | null
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_subscription"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      accelerator_programs: {
        Row: {
          created_at: string
          current_stage: number
          goal_reached: boolean | null
          goal_reached_date: string | null
          id: string
          program_end_date: string
          program_start_date: string
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stage?: number
          goal_reached?: boolean | null
          goal_reached_date?: string | null
          id?: string
          program_end_date: string
          program_start_date: string
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stage?: number
          goal_reached?: boolean | null
          goal_reached_date?: string | null
          id?: string
          program_end_date?: string
          program_start_date?: string
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accelerator_programs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      accelerator_stage_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          item_description: string | null
          item_name: string
          item_order: number
          stage_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          item_description?: string | null
          item_name: string
          item_order: number
          stage_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          item_description?: string | null
          item_name?: string
          item_order?: number
          stage_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      accelerator_stages: {
        Row: {
          completed_at: string | null
          created_at: string
          end_date: string
          id: string
          is_activated: boolean
          notes: string | null
          stage_name: string
          stage_number: number
          start_date: string
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          end_date: string
          id?: string
          is_activated?: boolean
          notes?: string | null
          stage_name: string
          stage_number: number
          start_date: string
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          end_date?: string
          id?: string
          is_activated?: boolean
          notes?: string | null
          stage_name?: string
          stage_number?: number
          start_date?: string
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accelerator_stages_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          client_id: string | null
          completed_by: string | null
          created_at: string
          id: string
          installment_id: string | null
          message: string
          metadata: Json | null
          sent_at: string | null
          slack_channel: string
          status: Database["public"]["Enums"]["alert_status"]
          subscription_id: string | null
          title: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          client_id?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          installment_id?: string | null
          message: string
          metadata?: Json | null
          sent_at?: string | null
          slack_channel: string
          status?: Database["public"]["Enums"]["alert_status"]
          subscription_id?: string | null
          title: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          client_id?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          installment_id?: string | null
          message?: string
          metadata?: Json | null
          sent_at?: string | null
          slack_channel?: string
          status?: Database["public"]["Enums"]["alert_status"]
          subscription_id?: string | null
          title?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_type: string | null
          created_at: string | null
          discord_nickname: string | null
          drive_folder_url: string | null
          email: string | null
          full_name: string
          id: string
          phone_number: string | null
          status: boolean | null
          updated_at: string | null
        }
        Insert: {
          client_type?: string | null
          created_at?: string | null
          discord_nickname?: string | null
          drive_folder_url?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone_number?: string | null
          status?: boolean | null
          updated_at?: string | null
        }
        Update: {
          client_type?: string | null
          created_at?: string | null
          discord_nickname?: string | null
          drive_folder_url?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone_number?: string | null
          status?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          attended_emails: string[]
          created_at: string
          description: string | null
          event_date: string
          id: string
          invited_emails: string[]
          meeting_code: string | null
          name: string
          updated_at: string
        }
        Insert: {
          attended_emails?: string[]
          created_at?: string
          description?: string | null
          event_date: string
          id?: string
          invited_emails?: string[]
          meeting_code?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          attended_emails?: string[]
          created_at?: string
          description?: string | null
          event_date?: string
          id?: string
          invited_emails?: string[]
          meeting_code?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      installments: {
        Row: {
          amount_usd: number
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          notes: string | null
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["installment_status"] | null
          subscription_id: string
          updated_at: string | null
        }
        Insert: {
          amount_usd: number
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["installment_status"] | null
          subscription_id: string
          updated_at?: string | null
        }
        Update: {
          amount_usd?: number
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["installment_status"] | null
          subscription_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          description: string | null
          duration_days: number
          id: string
          is_active: boolean | null
          name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_usd: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_days: number
          id?: string
          is_active?: boolean | null
          name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_usd: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean | null
          name?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price_usd?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      provisioned_services: {
        Row: {
          access_details: Json | null
          client_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          provisioned_at: string | null
          service_type: string
          subscription_id: string | null
        }
        Insert: {
          access_details?: Json | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provisioned_at?: string | null
          service_type: string
          subscription_id?: string | null
        }
        Update: {
          access_details?: Json | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provisioned_at?: string | null
          service_type?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provisioned_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisioned_services_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_access_shortcuts: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          call_level_included: boolean | null
          client_id: string
          created_at: string | null
          end_date: string
          id: string
          next_step:
            | Database["public"]["Enums"]["subscription_next_step"]
            | null
          notes: string | null
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          total_cost_usd: number
          updated_at: string | null
        }
        Insert: {
          call_level_included?: boolean | null
          client_id: string
          created_at?: string | null
          end_date: string
          id?: string
          next_step?:
            | Database["public"]["Enums"]["subscription_next_step"]
            | null
          notes?: string | null
          plan_id: string
          start_date: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          total_cost_usd: number
          updated_at?: string | null
        }
        Update: {
          call_level_included?: boolean | null
          client_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          next_step?:
            | Database["public"]["Enums"]["subscription_next_step"]
            | null
          notes?: string | null
          plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          total_cost_usd?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          approved_at: string | null
          created_at: string | null
          discord_nickname: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          super_admin: boolean
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          discord_nickname?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          is_approved?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          super_admin?: boolean
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          discord_nickname?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          super_admin?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_user: {
        Args: { user_id: string } | { user_id: string; approver_id: string }
        Returns: undefined
      }
      can_access_accelerator_data: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_accelerator_stage_changes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_payment_overdue_alerts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_renewal_upcoming_alerts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_service_expired_alerts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      extend_stage_deadline: {
        Args: { p_stage_id: string; p_days?: number }
        Returns: undefined
      }
      get_stage_checklist_progress: {
        Args: { p_subscription_id: string; p_stage_number: number }
        Returns: {
          template_id: string
          item_name: string
          item_description: string
          is_required: boolean
          is_completed: boolean
          completed_at: string
          completed_by: string
          notes: string
          item_order: number
        }[]
      }
    }
    Enums: {
      alert_status: "pending" | "sent" | "failed"
      alert_type:
        | "payment_overdue"
        | "renewal_upcoming"
        | "service_expired"
        | "new_sale"
        | "stage_change"
        | "stage_overdue"
        | "offboarding"
      installment_status: "pending" | "paid" | "overdue"
      payment_method:
        | "crypto"
        | "stripe"
        | "bank_transfer"
        | "paypal"
        | "bbva"
        | "dolar_app"
        | "payoneer"
        | "cash"
        | "binance"
        | "mercado_pago"
      plan_type: "core" | "renovation"
      subscription_next_step:
        | "in_service"
        | "needs_contact"
        | "pending_onboarding"
        | "pending_renewal"
        | "overdue_payment"
      subscription_status:
        | "active"
        | "inactive"
        | "pending_payment"
        | "cancelled"
      user_role: "admin" | "sales" | "operations" | "customer_success"
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
      alert_status: ["pending", "sent", "failed"],
      alert_type: [
        "payment_overdue",
        "renewal_upcoming",
        "service_expired",
        "new_sale",
        "stage_change",
        "stage_overdue",
        "offboarding",
      ],
      installment_status: ["pending", "paid", "overdue"],
      payment_method: [
        "crypto",
        "stripe",
        "bank_transfer",
        "paypal",
        "bbva",
        "dolar_app",
        "payoneer",
        "cash",
        "binance",
        "mercado_pago",
      ],
      plan_type: ["core", "renovation"],
      subscription_next_step: [
        "in_service",
        "needs_contact",
        "pending_onboarding",
        "pending_renewal",
        "overdue_payment",
      ],
      subscription_status: [
        "active",
        "inactive",
        "pending_payment",
        "cancelled",
      ],
      user_role: ["admin", "sales", "operations", "customer_success"],
    },
  },
} as const
