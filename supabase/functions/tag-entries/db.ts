import type { SupabaseClient } from "@supabase/supabase-js";
import type { TagDb } from "./types.ts";

/** Real `TagDb` over the service-role client. */
export function dbFromClient(client: SupabaseClient): TagDb {
  return {
    async untaggedDue() {
      const { data, error } = await client.rpc("untagged_due");
      if (error) throw new Error(`untagged_due: ${error.message}`);
      return data ?? [];
    },
    async getEntry(id) {
      const { data, error } = await client
        .from("entries")
        .select(
          "id,user_id,text,updated_at,category_id,tag_source,tagging_gave_up_at",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`get entry: ${error.message}`);
      return data;
    },
    async getCategories(userId) {
      const { data, error } = await client
        .from("categories")
        .select("id,name,description,status")
        .eq("user_id", userId);
      if (error) throw new Error(`get categories: ${error.message}`);
      return data ?? [];
    },
    async saveAiTag(a) {
      const { data, error } = await client.rpc("save_ai_tag", {
        p_entry_id: a.entryId,
        p_read_updated_at: a.readUpdatedAt,
        p_category_id: a.categoryId,
        p_proposed_name: a.proposedName,
        p_proposed_description: a.proposedDescription,
      });
      if (error) throw new Error(`save_ai_tag: ${error.message}`);
      return data === true;
    },
  };
}
