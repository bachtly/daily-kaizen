import type { SupabaseClient } from "@supabase/supabase-js";
import { pushDbFromClient } from "../_shared/pushDb.ts";
import type { NotifyDb } from "./types.ts";

/** Real `NotifyDb` over the service-role client. */
export function notifyDbFromClient(client: SupabaseClient): NotifyDb {
  return {
    ...pushDbFromClient(client),
    async claim() {
      const { data, error } = await client.rpc("claim_due_notifications");
      if (error) throw new Error(`claim_due_notifications: ${error.message}`);
      return data ?? [];
    },
    async getTimeZone(userId) {
      const { data, error } = await client
        .from("settings")
        .select("time_zone")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(`get settings: ${error.message}`);
      return data?.time_zone ?? null;
    },
    async getUserEmail(userId) {
      const { data, error } = await client.auth.admin.getUserById(userId);
      if (error) throw new Error(`get user: ${error.message}`);
      return data.user?.email ?? null;
    },
  };
}
