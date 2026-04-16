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
      branches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      claimed_rewards: {
        Row: {
          claimed_at: string
          expires_at: string | null
          id: string
          is_redeemed: boolean | null
          loyalty_card_id: string | null
          redeemed_at: string | null
          restaurant_id: string
          reward_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          expires_at?: string | null
          id?: string
          is_redeemed?: boolean | null
          loyalty_card_id?: string | null
          redeemed_at?: string | null
          restaurant_id: string
          reward_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          expires_at?: string | null
          id?: string
          is_redeemed?: boolean | null
          loyalty_card_id?: string | null
          redeemed_at?: string | null
          restaurant_id?: string
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claimed_rewards_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claimed_rewards_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claimed_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_banners: {
        Row: {
          created_at: string
          created_by: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          subtitle: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      loyalty_cards: {
        Row: {
          completed_at: string | null
          created_at: string
          current_stamps: number | null
          expires_at: string | null
          id: string
          is_completed: boolean | null
          restaurant_id: string
          reward_id: string | null
          total_visits: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_stamps?: number | null
          expires_at?: string | null
          id?: string
          is_completed?: boolean | null
          restaurant_id: string
          reward_id?: string | null
          total_visits?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_stamps?: number | null
          expires_at?: string | null
          id?: string
          is_completed?: boolean | null
          restaurant_id?: string
          reward_id?: string | null
          total_visits?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_cards_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_cards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_campaigns: {
        Row: {
          body: string
          created_at: string
          delivered_count: number
          failed_count: number
          id: string
          image_url: string | null
          opened_count: number
          restaurant_id: string
          sent_count: number
          status: string
          ticket_ids: Json | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          delivered_count?: number
          failed_count?: number
          id?: string
          image_url?: string | null
          opened_count?: number
          restaurant_id: string
          sent_count?: number
          status?: string
          ticket_ids?: Json | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          delivered_count?: number
          failed_count?: number
          id?: string
          image_url?: string | null
          opened_count?: number
          restaurant_id?: string
          sent_count?: number
          status?: string
          ticket_ids?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          razorpay_invoice_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          razorpay_invoice_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          razorpay_invoice_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          device_token: string | null
          email: string | null
          full_name: string | null
          id: string
          phone_number: string | null
          push_token: string | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          device_token?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone_number?: string | null
          push_token?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          device_token?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          push_token?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          google_review_url: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          opening_hours: Json | null
          owner_id: string
          phone: string | null
          slug: string | null
          social_links: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          google_review_url?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          owner_id: string
          phone?: string | null
          slug?: string | null
          social_links?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          google_review_url?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string
          phone?: string | null
          slug?: string | null
          social_links?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          expiry_days: number | null
          id: string
          is_active: boolean | null
          name: string
          restaurant_id: string
          reward_image_url: string | null
          stamps_required: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expiry_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          restaurant_id: string
          reward_image_url?: string | null
          stamps_required?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expiry_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          restaurant_id?: string
          reward_image_url?: string | null
          stamps_required?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          branch_id: string | null
          id: string
          location_verified: boolean | null
          loyalty_card_id: string | null
          restaurant_id: string
          scanned_at: string
          staff_approved: boolean | null
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          id?: string
          location_verified?: boolean | null
          loyalty_card_id?: string | null
          restaurant_id: string
          scanned_at?: string
          staff_approved?: boolean | null
          user_id: string
        }
        Update: {
          branch_id?: string | null
          id?: string
          location_verified?: boolean | null
          loyalty_card_id?: string | null
          restaurant_id?: string
          scanned_at?: string
          staff_approved?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          admin_notes: string | null
          admin_override: boolean | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_tier: string
          razorpay_customer_id: string | null
          razorpay_plan_id: string | null
          razorpay_subscription_id: string | null
          restaurant_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_end: string
          trial_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          admin_override?: boolean | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_tier?: string
          razorpay_customer_id?: string | null
          razorpay_plan_id?: string | null
          razorpay_subscription_id?: string | null
          restaurant_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end?: string
          trial_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          admin_override?: boolean | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_tier?: string
          razorpay_customer_id?: string | null
          razorpay_plan_id?: string | null
          razorpay_subscription_id?: string | null
          restaurant_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end?: string
          trial_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
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
      check_subscription_access: {
        Args: { owner_user_id: string }
        Returns: boolean
      }
      get_customer_data_v3: { Args: { c_user_id: string }; Returns: Json }
      get_owner_stats_v2: { Args: { res_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "restaurant_owner" | "customer"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "cancelled"
        | "expired"
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
      app_role: ["admin", "restaurant_owner", "customer"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "cancelled",
        "expired",
      ],
    },
  },
} as const
