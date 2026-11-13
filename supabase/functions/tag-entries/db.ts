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
          "id,user_id,text,updated_at,category_id,tag_source,activity_source,tagging_gave_up_at",
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
    async getActiveActivityNames(userId) {
      const { data, error } = await client
        .from("activities")
        .select("name")
        .eq("user_id", userId)
        .eq("status", "active");
      if (error) throw new Error(`get activities: ${error.message}`);
      return (data ?? []).map((a: { name: string }) => a.name);
    },
    async getCorrections(userId) {
      const { data, error } = await client
        .from("entries")
        .select(
          "text,tag_source,activity_source,category:categories!category_id(name),entry_activities(activity:activities(name,status,target:activities!merged_into_id(name)))",
        )
        .eq("user_id", userId)
        .eq("entry_activities.user_id", userId)
        .or("tag_source.eq.me,activity_source.eq.me")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(`get corrections: ${error.message}`);
      // deno-lint-ignore no-explicit-any
      return (data ?? []).map((r: any) => ({
        text: r.text,
        tag_source: r.tag_source,
        activity_source: r.activity_source,
        category_name: r.category?.name ?? null,
        activity_names: (r.entry_activities ?? [])
          // deno-lint-ignore no-explicit-any
          .map((ea: any) =>
            ea.activity?.status === "merged"
              ? ea.activity.target?.name
              : ea.activity?.name
          )
          .filter((n: unknown): n is string => typeof n === "string")
          .sort(),
      }));
    },
    async saveAiLabels(a) {
      const { data, error } = await client.rpc("save_ai_labels", {
        p_entry_id: a.entryId,
        p_read_updated_at: a.readUpdatedAt,
        p_category_id: a.categoryId,
        p_proposed_name: a.proposedName,
        p_proposed_description: a.proposedDescription,
        p_activity_names: a.activityNames,
      });
      if (error) throw new Error(`save_ai_labels: ${error.message}`);
      return data === true;
    },
    async recordTagFailure(entryId, readUpdatedAt) {
      const { error } = await client.rpc("record_tag_failure", {
        p_entry_id: entryId,
        p_read_updated_at: readUpdatedAt,
      });
      if (error) throw new Error(`record_tag_failure: ${error.message}`);
    },
  };
}
