import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushDb } from "./push.ts";

/** Push subscription access over the service-role client. */
export function pushDbFromClient(client: SupabaseClient): PushDb {
  return {
    async getSubscriptions(userId) {
      const { data, error } = await client
        .from("push_subscriptions")
        .select("id,endpoint,p256dh,auth")
        .eq("user_id", userId);
      if (error) throw new Error(`get subscriptions: ${error.message}`);
      return data ?? [];
    },
    async deleteSubscription(id) {
      const { error } = await client.from("push_subscriptions").delete().eq(
        "id",
        id,
      );
      if (error) throw new Error(`delete subscription: ${error.message}`);
    },
  };
}
