export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      accelerator_stages: {
        Row: {
          completed_at: string | null
          created_at: string
          end_date: string
          id: string
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
          created_at: string | null
          drive_folder_url: string | null
          email: string
          full_name: string
          id: string
          phone_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          drive_folder_url?: string | null
          email: string
          full_name: string
          id?: string
          phone_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          drive_folder_url?: string | null
          email?: string
          full_name?: string
          id?: string
          phone_number?: string | null
          updated_at?: string | null
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
          created_at: string | null
          id: string
          is_active: boolean | null
          provisioned_at: string | null
          service_type: string
          subscription_id: string
        }
        Insert: {
          access_details?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provisioned_at?: string | null
          service_type: string
          subscription_id: string
        }
        Update: {
          access_details?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provisioned_at?: string | null
          service_type?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provisioned_services_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
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
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          is_approved?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
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
      installment_status: "pending" | "paid" | "overdue"
      payment_method: "crypto" | "stripe" | "bank_transfer" | "paypal"
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
      ],
      installment_status: ["pending", "paid", "overdue"],
      payment_method: ["crypto", "stripe", "bank_transfer", "paypal"],
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
