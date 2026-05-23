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
      documentary: {
        Row: {
          asset_id: string
          chapters: Json
          credits: Json
          format: string
          poster_path: string | null
          runtime: string
          synopsis: string
          title: string
          video_path: string | null
          year: string
        }
        Insert: {
          asset_id: string
          chapters?: Json
          credits?: Json
          format?: string
          poster_path?: string | null
          runtime?: string
          synopsis?: string
          title?: string
          video_path?: string | null
          year?: string
        }
        Update: {
          asset_id?: string
          chapters?: Json
          credits?: Json
          format?: string
          poster_path?: string | null
          runtime?: string
          synopsis?: string
          title?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      app_role: ["admin", "user"],
    },
  },
} as const
