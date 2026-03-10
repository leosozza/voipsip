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
      bitrix_credentials: {
        Row: {
          access_token: string | null
          bitrix_domain: string
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          bitrix_domain: string
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          bitrix_domain?: string
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bitrix_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bitrix_events: {
        Row: {
          bitrix_user_id: string | null
          call_id: string | null
          company_id: string
          created_at: string
          crm_entity_id: string | null
          crm_entity_type: string | null
          event_type: string
          id: string
          phone_number: string | null
          processed_at: string | null
          raw_data: Json | null
          status: string
        }
        Insert: {
          bitrix_user_id?: string | null
          call_id?: string | null
          company_id: string
          created_at?: string
          crm_entity_id?: string | null
          crm_entity_type?: string | null
          event_type: string
          id?: string
          phone_number?: string | null
          processed_at?: string | null
          raw_data?: Json | null
          status?: string
        }
        Update: {
          bitrix_user_id?: string | null
          call_id?: string | null
          company_id?: string
          created_at?: string
          crm_entity_id?: string | null
          crm_entity_type?: string | null
          event_type?: string
          id?: string
          phone_number?: string | null
          processed_at?: string | null
          raw_data?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bitrix_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bitrix_installations: {
        Row: {
          access_token: string | null
          company_id: string | null
          created_at: string
          domain: string
          expires_at: string | null
          id: string
          member_id: string
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          company_id?: string | null
          created_at?: string
          domain: string
          expires_at?: string | null
          id?: string
          member_id: string
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          company_id?: string | null
          created_at?: string
          domain?: string
          expires_at?: string | null
          id?: string
          member_id?: string
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bitrix_installations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          call_ended_at: string | null
          call_started_at: string
          caller_name: string | null
          company_id: string
          created_at: string
          direction: string
          duration_seconds: number | null
          external_line_id: string | null
          id: string
          phone_number: string
          recording_url: string | null
          sip_call_id: string | null
          status: string
          user_mapping_id: string | null
        }
        Insert: {
          call_ended_at?: string | null
          call_started_at?: string
          caller_name?: string | null
          company_id: string
          created_at?: string
          direction: string
          duration_seconds?: number | null
          external_line_id?: string | null
          id?: string
          phone_number: string
          recording_url?: string | null
          sip_call_id?: string | null
          status: string
          user_mapping_id?: string | null
        }
        Update: {
          call_ended_at?: string | null
          call_started_at?: string
          caller_name?: string | null
          company_id?: string
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          external_line_id?: string | null
          id?: string
          phone_number?: string
          recording_url?: string | null
          sip_call_id?: string | null
          status?: string
          user_mapping_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_external_line_id_fkey"
            columns: ["external_line_id"]
            isOneToOne: false
            referencedRelation: "external_phone_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          company_id: string
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      extensions: {
        Row: {
          company_id: string
          created_at: string
          display_name: string | null
          extension_number: string
          id: string
          sip_account_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          display_name?: string | null
          extension_number: string
          id?: string
          sip_account_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          display_name?: string | null
          extension_number?: string
          id?: string
          sip_account_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extensions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extensions_sip_account_id_fkey"
            columns: ["sip_account_id"]
            isOneToOne: false
            referencedRelation: "sip_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      external_phone_lines: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_default: boolean | null
          line_name: string | null
          line_number: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          line_name?: string | null
          line_number: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          line_name?: string | null
          line_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_phone_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sip_accounts: {
        Row: {
          company_id: string
          created_at: string
          display_name: string
          id: string
          is_default: boolean | null
          sip_domain: string | null
          sip_password: string
          sip_server: string
          sip_username: string
          transport: string
          updated_at: string
          ws_port: number
        }
        Insert: {
          company_id: string
          created_at?: string
          display_name?: string
          id?: string
          is_default?: boolean | null
          sip_domain?: string | null
          sip_password: string
          sip_server: string
          sip_username: string
          transport?: string
          updated_at?: string
          ws_port?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          display_name?: string
          id?: string
          is_default?: boolean | null
          sip_domain?: string | null
          sip_password?: string
          sip_server?: string
          sip_username?: string
          transport?: string
          updated_at?: string
          ws_port?: number
        }
        Relationships: [
          {
            foreignKeyName: "sip_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_company_admin: { Args: { p_company_id: string }; Returns: boolean }
      is_company_member: { Args: { p_company_id: string }; Returns: boolean }
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
