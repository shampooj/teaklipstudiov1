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
      admin_labels: {
        Row: {
          admin_lip_tone_category: string | null
          admin_skin_tone_category: string | null
          created_at: string
          id: string
          image_id: string | null
          labeled_at: string | null
          labeled_by_user_id: string | null
        }
        Insert: {
          admin_lip_tone_category?: string | null
          admin_skin_tone_category?: string | null
          created_at?: string
          id?: string
          image_id?: string | null
          labeled_at?: string | null
          labeled_by_user_id?: string | null
        }
        Update: {
          admin_lip_tone_category?: string | null
          admin_skin_tone_category?: string | null
          created_at?: string
          id?: string
          image_id?: string | null
          labeled_at?: string | null
          labeled_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_labels_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "customer_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_categorization: {
        Row: {
          ai_lip_tone: string | null
          ai_skin_tone: string | null
          created_at: string
          id: string
          model_name: string
          submission_id: string | null
        }
        Insert: {
          ai_lip_tone?: string | null
          ai_skin_tone?: string | null
          created_at?: string
          id?: string
          model_name: string
          submission_id?: string | null
        }
        Update: {
          ai_lip_tone?: string | null
          ai_skin_tone?: string | null
          created_at?: string
          id?: string
          model_name?: string
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_categorization_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "customer_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      customer_submissions: {
        Row: {
          created_at: string
          email: string | null
          id: string
          image_id: string | null
          image_url: string | null
          is_labeled: boolean
          lip_tone: string | null
          shirt: string | null
          skin_tone: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          image_id?: string | null
          image_url?: string | null
          is_labeled?: boolean
          lip_tone?: string | null
          shirt?: string | null
          skin_tone?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          image_id?: string | null
          image_url?: string | null
          is_labeled?: boolean
          lip_tone?: string | null
          shirt?: string | null
          skin_tone?: string | null
          variant_id?: string
        }
        Relationships: []
      }
      lipstick_shade_settings: {
        Row: {
          finish: string
          gloss: number
          hex: string
          id: string
          lip_tone: string
          opacity: number
          shine_intensity: number
          shine_scale: number
          skin_tone: string
          updated_at: string
          updated_by_user_id: string | null
          variant_name: string
        }
        Insert: {
          finish?: string
          gloss?: number
          hex?: string
          id?: string
          lip_tone: string
          opacity?: number
          shine_intensity?: number
          shine_scale?: number
          skin_tone: string
          updated_at?: string
          updated_by_user_id?: string | null
          variant_name: string
        }
        Update: {
          finish?: string
          gloss?: number
          hex?: string
          id?: string
          lip_tone?: string
          opacity?: number
          shine_intensity?: number
          shine_scale?: number
          skin_tone?: string
          updated_at?: string
          updated_by_user_id?: string | null
          variant_name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          email: string | null
          id: string
        }
        Insert: {
          email?: string | null
          id: string
        }
        Update: {
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      quiz_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_name: string
          id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_name: string
          id?: string
          session_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_name?: string
          id?: string
          session_id?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          category: string
          lip_tone: string
          skin_tone: string
          updated_at: string
          updated_by: string | null
          variant_name: string
        }
        Insert: {
          category: string
          lip_tone: string
          skin_tone: string
          updated_at?: string
          updated_by?: string | null
          variant_name: string
        }
        Update: {
          category?: string
          lip_tone?: string
          skin_tone?: string
          updated_at?: string
          updated_by?: string | null
          variant_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_customer_submission:
        | {
            Args: {
              p_email?: string
              p_image_id?: string
              p_image_url?: string
              p_lip_tone?: string
              p_skin_tone?: string
              p_variant_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_email?: string
              p_image_id?: string
              p_image_url?: string
              p_lip_tone?: string
              p_shirt?: string
              p_skin_tone?: string
              p_variant_id: string
            }
            Returns: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
