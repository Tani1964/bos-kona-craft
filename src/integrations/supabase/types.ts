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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asset_telemetry: {
        Row: {
          age_days: number
          asset_id: string
          care_entries: number
          nfc_scans: number
          repairs: number
          updated_at: string
          wears: number
        }
        Insert: {
          age_days?: number
          asset_id: string
          care_entries?: number
          nfc_scans?: number
          repairs?: number
          updated_at?: string
          wears?: number
        }
        Update: {
          age_days?: number
          asset_id?: string
          care_entries?: number
          nfc_scans?: number
          repairs?: number
          updated_at?: string
          wears?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_telemetry_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string
          hero_style: Json
          id: string
          lot: string | null
          model_name: string
          serial: string
          status: string
          store_product_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          hero_style?: Json
          id?: string
          lot?: string | null
          model_name: string
          serial: string
          status?: string
          store_product_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          hero_style?: Json
          id?: string
          lot?: string | null
          model_name?: string
          serial?: string
          status?: string
          store_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      atelier: {
        Row: {
          asset_id: string
          lat: number | null
          lng: number | null
          location: string
          name: string
        }
        Insert: {
          asset_id: string
          lat?: number | null
          lng?: number | null
          location: string
          name: string
        }
        Update: {
          asset_id?: string
          lat?: number | null
          lng?: number | null
          location?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "atelier_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      care_events: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          occurred_at: string
          owner_phone: string
          raw_payload: Json | null
          session_id: string | null
          tool_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          occurred_at?: string
          owner_phone: string
          raw_payload?: Json | null
          session_id?: string | null
          tool_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          occurred_at?: string
          owner_phone?: string
          raw_payload?: Json | null
          session_id?: string | null
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "care_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_events_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "care_tools"
            referencedColumns: ["tool_id"]
          },
        ]
      }
      care_insights: {
        Row: {
          asset_id: string
          body: string
          created_at: string
          id: string
          kind: string
          owner_phone: string
          shown_at: string | null
          source_ref: Json | null
        }
        Insert: {
          asset_id: string
          body: string
          created_at?: string
          id?: string
          kind: string
          owner_phone: string
          shown_at?: string | null
          source_ref?: Json | null
        }
        Update: {
          asset_id?: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          owner_phone?: string
          shown_at?: string | null
          source_ref?: Json | null
        }
        Relationships: []
      }
      care_sessions: {
        Row: {
          asset_id: string
          classification: string | null
          created_at: string
          ended_at: string | null
          id: string
          owner_phone: string
          started_at: string
          status: string
          tools_used: string[]
        }
        Insert: {
          asset_id: string
          classification?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          owner_phone: string
          started_at?: string
          status?: string
          tools_used?: string[]
        }
        Update: {
          asset_id?: string
          classification?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          owner_phone?: string
          started_at?: string
          status?: string
          tools_used?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "care_sessions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      care_tools: {
        Row: {
          active: boolean
          created_at: string
          kfi_weight: number
          tool_id: string
          tool_name: string
          tool_type: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          kfi_weight?: number
          tool_id: string
          tool_name: string
          tool_type: string
        }
        Update: {
          active?: boolean
          created_at?: string
          kfi_weight?: number
          tool_id?: string
          tool_name?: string
          tool_type?: string
        }
        Relationships: []
      }
      documentary: {
        Row: {
          asset_id: string
          chapters: Json
          credits: Json
          external_url: string | null
          format: string
          poster_path: string | null
          runtime: string
          synopsis: string
          title: string
          transform_external_url: string | null
          video_path: string | null
          year: string
        }
        Insert: {
          asset_id: string
          chapters?: Json
          credits?: Json
          external_url?: string | null
          format?: string
          poster_path?: string | null
          runtime?: string
          synopsis?: string
          title?: string
          transform_external_url?: string | null
          video_path?: string | null
          year?: string
        }
        Update: {
          asset_id?: string
          chapters?: Json
          credits?: Json
          external_url?: string | null
          format?: string
          poster_path?: string | null
          runtime?: string
          synopsis?: string
          title?: string
          transform_external_url?: string | null
          video_path?: string | null
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentary_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      makers: {
        Row: {
          asset_id: string
          id: string
          name: string
          position: number
          role: string
          years: string
        }
        Insert: {
          asset_id: string
          id?: string
          name: string
          position?: number
          role: string
          years: string
        }
        Update: {
          asset_id?: string
          id?: string
          name?: string
          position?: number
          role?: string
          years?: string
        }
        Relationships: [
          {
            foreignKeyName: "makers_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      module_overrides: {
        Row: {
          asset_id: string
          id: string
          module_id: string
          subtitle_override: string | null
          thumbnail_override: Json | null
          title_override: string | null
        }
        Insert: {
          asset_id: string
          id?: string
          module_id: string
          subtitle_override?: string | null
          thumbnail_override?: Json | null
          title_override?: string | null
        }
        Update: {
          asset_id?: string
          id?: string
          module_id?: string
          subtitle_override?: string | null
          thumbnail_override?: Json | null
          title_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_overrides_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_records: {
        Row: {
          acquired_at: string
          asset_id: string
          created_at: string
          event_type: string
          id: string
          notes: string | null
          owner_phone: string | null
          owner_ref: string | null
          store_order_id: string | null
        }
        Insert: {
          acquired_at?: string
          asset_id: string
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          owner_phone?: string | null
          owner_ref?: string | null
          store_order_id?: string | null
        }
        Update: {
          acquired_at?: string
          asset_id?: string
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          owner_phone?: string | null
          owner_ref?: string | null
          store_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ownership_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      provenance_stages: {
        Row: {
          asset_id: string
          body: string
          date_text: string
          icon_key: string
          id: string
          label: string
          location: string
          position: number
          title: string
        }
        Insert: {
          asset_id: string
          body: string
          date_text: string
          icon_key?: string
          id?: string
          label: string
          location: string
          position?: number
          title: string
        }
        Update: {
          asset_id?: string
          body?: string
          date_text?: string
          icon_key?: string
          id?: string
          label?: string
          location?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "provenance_stages_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
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
      wear_events: {
        Row: {
          asset_id: string
          created_at: string
          effective_stress: number | null
          ended_at: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          owner_phone: string
          rain_probability: number | null
          started_at: string
          transport_mode: string
          weather_snapshot: Json | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          effective_stress?: number | null
          ended_at?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          owner_phone: string
          rain_probability?: number | null
          started_at?: string
          transport_mode?: string
          weather_snapshot?: Json | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          effective_stress?: number | null
          ended_at?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          owner_phone?: string
          rain_probability?: number | null
          started_at?: string
          transport_mode?: string
          weather_snapshot?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_cron_runs: {
        Args: { _limit?: number }
        Returns: {
          active: boolean
          duration_ms: number
          end_time: string
          jobid: number
          jobname: string
          return_message: string
          runid: number
          schedule: string
          start_time: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
