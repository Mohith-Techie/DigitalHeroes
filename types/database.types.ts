/**
 * Digital Heroes — generated database types.
 *
 * Shape matches `supabase gen types typescript`, so regenerating with the CLI
 * produces a clean diff:
 *
 *   npx supabase gen types typescript --project-id <ref> > types/database.types.ts
 *
 * Do not add application-level aliases here; they are lost on regeneration.
 * Put those in a separate file, e.g. `export type User = Tables<'users'>`.
 */

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
      charities: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          registration_number: string | null
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          registration_number?: string | null
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          registration_number?: string | null
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      draws: {
        Row: {
          charity_pool: number
          created_at: string
          draw_date: string
          drawn_at: string | null
          entries_count: number
          id: string
          prize_pool: number
          status: Database["public"]["Enums"]["draw_status"]
          total_pool: number
          updated_at: string
          winning_numbers: number[] | null
        }
        Insert: {
          charity_pool?: number
          created_at?: string
          draw_date: string
          drawn_at?: string | null
          entries_count?: number
          id?: string
          prize_pool?: number
          status?: Database["public"]["Enums"]["draw_status"]
          total_pool?: number
          updated_at?: string
          winning_numbers?: number[] | null
        }
        Update: {
          charity_pool?: number
          created_at?: string
          draw_date?: string
          drawn_at?: string | null
          entries_count?: number
          id?: string
          prize_pool?: number
          status?: Database["public"]["Enums"]["draw_status"]
          total_pool?: number
          updated_at?: string
          winning_numbers?: number[] | null
        }
        Relationships: []
      }
      scores: {
        Row: {
          created_at: string
          id: string
          score: number
          score_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          score: number
          score_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number
          score_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          charity_id: string | null
          charity_percentage: number
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_current_period_end: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          charity_id?: string | null
          charity_percentage?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          charity_id?: string | null
          charity_percentage?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "charities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      winners: {
        Row: {
          charity_amount: number
          charity_id: string | null
          created_at: string
          draw_id: string
          id: string
          match_tier: number
          matched_numbers: number[] | null
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          prize_amount: number
          proof_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          charity_amount?: number
          charity_id?: string | null
          created_at?: string
          draw_id: string
          id?: string
          match_tier: number
          matched_numbers?: number[] | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          prize_amount?: number
          proof_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          charity_amount?: number
          charity_id?: string | null
          created_at?: string
          draw_id?: string
          id?: string
          match_tier?: number
          matched_numbers?: number[] | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          prize_amount?: number
          proof_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "winners_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "charities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_valid_draw_numbers: {
        Args: { nums: number[] }
        Returns: boolean
      }
    }
    Enums: {
      draw_status:
        | "scheduled"
        | "open"
        | "closed"
        | "drawn"
        | "settled"
        | "cancelled"
      payment_status: "pending" | "processing" | "paid" | "failed" | "cancelled"
      subscription_status:
        | "inactive"
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "paused"
      user_role: "user" | "admin"
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
      draw_status: [
        "scheduled",
        "open",
        "closed",
        "drawn",
        "settled",
        "cancelled",
      ],
      payment_status: ["pending", "processing", "paid", "failed", "cancelled"],
      subscription_status: [
        "inactive",
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "paused",
      ],
      user_role: ["user", "admin"],
    },
  },
} as const
