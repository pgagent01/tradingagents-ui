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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agent_outputs: {
        Row: {
          agent_id: string
          content: string | null
          cost_usd: number
          created_at: string
          credit_basis: string | null
          id: string
          input_tokens: number
          lovable_credits: number | null
          model_used: string | null
          output_tokens: number
          run_id: string
          status: string | null
          usage_details: Json | null
        }
        Insert: {
          agent_id: string
          content?: string | null
          cost_usd?: number
          created_at?: string
          credit_basis?: string | null
          id?: string
          input_tokens?: number
          lovable_credits?: number | null
          model_used?: string | null
          output_tokens?: number
          run_id: string
          status?: string | null
          usage_details?: Json | null
        }
        Update: {
          agent_id?: string
          content?: string | null
          cost_usd?: number
          created_at?: string
          credit_basis?: string | null
          id?: string
          input_tokens?: number
          lovable_credits?: number | null
          model_used?: string | null
          output_tokens?: number
          run_id?: string
          status?: string | null
          usage_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_outputs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "research_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_access_state: {
        Row: {
          paused: boolean
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          paused?: boolean
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          paused?: boolean
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          revoked_at: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          revoked_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          revoked_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      research_data_cache: {
        Row: {
          cache_key: string
          expires_at: string
          fetched_at: string
          payload: Json
          provider: string
          user_id: string
        }
        Insert: {
          cache_key: string
          expires_at: string
          fetched_at?: string
          payload: Json
          provider: string
          user_id: string
        }
        Update: {
          cache_key?: string
          expires_at?: string
          fetched_at?: string
          payload?: Json
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      research_events: {
        Row: {
          agent_id: string | null
          created_at: string
          data: Json | null
          event_type: string
          id: string
          message: string | null
          run_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          data?: Json | null
          event_type: string
          id?: string
          message?: string | null
          run_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          data?: Json | null
          event_type?: string
          id?: string
          message?: string | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "research_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      research_reports: {
        Row: {
          conviction_score: number | null
          created_at: string
          credit_basis: string | null
          executive_summary: string | null
          id: string
          lovable_credits: number | null
          price_target: number | null
          recommendation: string | null
          risk_level: string | null
          run_id: string
          sections: Json
          ticker: string
          total_cost_usd: number
          total_input_tokens: number
          total_output_tokens: number
          usage_recorded: boolean
        }
        Insert: {
          conviction_score?: number | null
          created_at?: string
          credit_basis?: string | null
          executive_summary?: string | null
          id?: string
          lovable_credits?: number | null
          price_target?: number | null
          recommendation?: string | null
          risk_level?: string | null
          run_id: string
          sections?: Json
          ticker: string
          total_cost_usd?: number
          total_input_tokens?: number
          total_output_tokens?: number
          usage_recorded?: boolean
        }
        Update: {
          conviction_score?: number | null
          created_at?: string
          credit_basis?: string | null
          executive_summary?: string | null
          id?: string
          lovable_credits?: number | null
          price_target?: number | null
          recommendation?: string | null
          risk_level?: string | null
          run_id?: string
          sections?: Json
          ticker?: string
          total_cost_usd?: number
          total_input_tokens?: number
          total_output_tokens?: number
          usage_recorded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "research_reports_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "research_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      research_runs: {
        Row: {
          analysis_date: string
          completed_at: string | null
          created_at: string
          credit_basis: string | null
          error_message: string | null
          execution_lease_until: string | null
          id: string
          is_demo: boolean
          lookback_days: number
          lovable_credits: number | null
          model_config: Json
          research_depth: string
          selected_agents: Json
          started_at: string | null
          status: string
          ticker: string
          total_cost_usd: number
          total_input_tokens: number
          total_output_tokens: number
          user_id: string
        }
        Insert: {
          analysis_date?: string
          completed_at?: string | null
          created_at?: string
          credit_basis?: string | null
          error_message?: string | null
          execution_lease_until?: string | null
          id?: string
          is_demo?: boolean
          lookback_days?: number
          lovable_credits?: number | null
          model_config?: Json
          research_depth?: string
          selected_agents?: Json
          started_at?: string | null
          status?: string
          ticker: string
          total_cost_usd?: number
          total_input_tokens?: number
          total_output_tokens?: number
          user_id?: string
        }
        Update: {
          analysis_date?: string
          completed_at?: string | null
          created_at?: string
          credit_basis?: string | null
          error_message?: string | null
          execution_lease_until?: string | null
          id?: string
          is_demo?: boolean
          lookback_days?: number
          lovable_credits?: number | null
          model_config?: Json
          research_depth?: string
          selected_agents?: Json
          started_at?: string | null
          status?: string
          ticker?: string
          total_cost_usd?: number
          total_input_tokens?: number
          total_output_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string
          id: string
          key_ciphertext: string
          key_hint: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_ciphertext: string
          key_hint: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_ciphertext?: string
          key_hint?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          daily_budget_usd: number
          default_depth: string
          default_provider: string
          simulate_demo_run: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          daily_budget_usd?: number
          default_depth?: string
          default_provider?: string
          simulate_demo_run?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          daily_budget_usd?: number
          default_depth?: string
          default_provider?: string
          simulate_demo_run?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlist_items: {
        Row: {
          created_at: string
          id: string
          notify_earnings: boolean
          notify_sentiment: boolean
          ticker: string
          user_id: string
          valuation_threshold_pct: number
        }
        Insert: {
          created_at?: string
          id?: string
          notify_earnings?: boolean
          notify_sentiment?: boolean
          ticker: string
          user_id: string
          valuation_threshold_pct?: number
        }
        Update: {
          created_at?: string
          id?: string
          notify_earnings?: boolean
          notify_sentiment?: boolean
          ticker?: string
          user_id?: string
          valuation_threshold_pct?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_usage_audit: {
        Args: never
        Returns: {
          account_id: string
          credits: number
          day: string
          input_tokens: number
          output_tokens: number
          runs: number
          unknown_credits: number
          usd: number
        }[]
      }
      advance_demo_run: { Args: { _run_id: string }; Returns: undefined }
      claim_research_execution: { Args: { _run_id: string }; Returns: boolean }
      finalize_research_report: {
        Args: { _report: Json; _run_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_valid_invite_code: { Args: { _code: string }; Returns: boolean }
      save_agent_result: {
        Args: { _output_id: string; _result: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
