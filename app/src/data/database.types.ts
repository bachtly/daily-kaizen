// Generated, do not edit. From the repo root, with the local db started from main's migrations:
//   npx supabase@3.0.0 db start
//   npx supabase@3.0.0 gen types typescript --local --schema public > /tmp/db.raw.ts
//   { head -n 6 app/src/data/database.types.ts; cat /tmp/db.raw.ts; } > /tmp/db.ts && mv /tmp/db.ts app/src/data/database.types.ts
//   (cd app && npx oxfmt src/data/database.types.ts)
// Regenerate after any migration change.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          description: string;
          id: string;
          name: string;
          status: Database["public"]["Enums"]["category_status"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          description: string;
          id?: string;
          name: string;
          status?: Database["public"]["Enums"]["category_status"];
          user_id?: string;
        };
        Update: {
          description?: string;
          id?: string;
          name?: string;
          status?: Database["public"]["Enums"]["category_status"];
          user_id?: string;
        };
        Relationships: [];
      };
      entries: {
        Row: {
          category_id: string | null;
          created_at: string;
          ended_at: string;
          form_opened_at: string;
          id: string;
          started_at: string;
          suggested_category_id: string | null;
          tag_attempts: number;
          tag_source: Database["public"]["Enums"]["tag_source"] | null;
          tagged_at: string | null;
          tagging_gave_up_at: string | null;
          text: string;
          time_zone: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          category_id?: string | null;
          created_at?: string;
          ended_at: string;
          form_opened_at: string;
          id: string;
          started_at: string;
          suggested_category_id?: string | null;
          tag_attempts?: number;
          tag_source?: Database["public"]["Enums"]["tag_source"] | null;
          tagged_at?: string | null;
          tagging_gave_up_at?: string | null;
          text: string;
          time_zone: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          ended_at?: string;
          form_opened_at?: string;
          id?: string;
          started_at?: string;
          suggested_category_id?: string | null;
          tag_attempts?: number;
          tag_source?: Database["public"]["Enums"]["tag_source"] | null;
          tagged_at?: string | null;
          tagging_gave_up_at?: string | null;
          text?: string;
          time_zone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entries_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entries_suggested_category_id_fkey";
            columns: ["suggested_category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications_sent: {
        Row: {
          about: string;
          kind: Database["public"]["Enums"]["notification_kind"];
          sent_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          about: string;
          kind: Database["public"]["Enums"]["notification_kind"];
          sent_at?: string;
          user_id: string;
        };
        Update: {
          about?: string;
          kind?: Database["public"]["Enums"]["notification_kind"];
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_id?: string;
        };
        Update: {
          auth?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          nudge_gap_hours: number;
          quiet_end: string;
          quiet_start: string;
          time_zone: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          nudge_gap_hours?: number;
          quiet_end?: string;
          quiet_start?: string;
          time_zone?: string | null;
          user_id?: string;
        };
        Update: {
          nudge_gap_hours?: number;
          quiet_end?: string;
          quiet_start?: string;
          time_zone?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      weekly_reviews: {
        Row: {
          done_at: string;
          user_id: string;
          week_start: string;
        };
        ComputedFields: never;
        Insert: {
          done_at?: string;
          user_id?: string;
          week_start: string;
        };
        Update: {
          done_at?: string;
          user_id?: string;
          week_start?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      nfr_report: {
        Row: {
          created_at: string;
          gave_up: boolean | null;
          id: string;
          save_delay: string | null;
          tag_delay: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          gave_up?: never;
          id?: string | null;
          save_delay?: never;
          tag_delay?: never;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          gave_up?: never;
          id?: string | null;
          save_delay?: never;
          tag_delay?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      approve_category: { Args: { category_id: string }; Returns: Json };
      claim_due_notifications: {
        Args: { p_now?: string };
        Returns: {
          about: string;
          kind: Database["public"]["Enums"]["notification_kind"];
          sent_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "notifications_sent";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      post_job: { Args: { p_url_secret: string }; Returns: undefined };
      record_tag_failure: {
        Args: { p_entry_id: string; p_read_updated_at: string };
        Returns: undefined;
      };
      reject_category: { Args: { category_id: string }; Returns: Json };
      save_ai_tag: {
        Args: {
          p_category_id: string;
          p_entry_id: string;
          p_proposed_description: string;
          p_proposed_name: string;
          p_read_updated_at: string;
        };
        Returns: boolean;
      };
      seed_account: { Args: { uid: string }; Returns: undefined };
      set_entry_tag: { Args: { category_id: string; entry_id: string }; Returns: Json };
      untagged_due: {
        Args: Record<PropertyKey, never>;
        Returns: {
          category_id: string | null;
          created_at: string;
          ended_at: string;
          form_opened_at: string;
          id: string;
          started_at: string;
          suggested_category_id: string | null;
          tag_attempts: number;
          tag_source: Database["public"]["Enums"]["tag_source"] | null;
          tagged_at: string | null;
          tagging_gave_up_at: string | null;
          text: string;
          time_zone: string;
          updated_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "entries";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      category_status: "active" | "suggested" | "rejected";
      notification_kind: "nudge" | "review_reminder";
      tag_source: "ai" | "me";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      category_status: ["active", "suggested", "rejected"],
      notification_kind: ["nudge", "review_reminder"],
      tag_source: ["ai", "me"],
    },
  },
} as const;
