export interface EntryRow {
  id: string;
  user_id: string;
  text: string;
  updated_at: string;
  category_id: string | null;
  tag_source: string | null;
  tagging_gave_up_at: string | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  description: string;
  status: "active" | "suggested" | "rejected";
}

export interface TagReply {
  category_name: string;
  proposed: { name: string; description: string } | null;
}

/**
 * Arguments of the `save_ai_tag()` database helper (service_role only; built in db-tagging).
 * Contract this function codes against:
 *   save_ai_tag(p_entry_id uuid, p_read_updated_at timestamptz, p_category_id uuid,
 *               p_proposed_name text, p_proposed_description text) returns boolean
 * - p_category_id set: one tx inserts the Suggested category (if proposed and new, on conflict do nothing),
 *   then updates the Entry only if tag_source is distinct from 'me' and updated_at = p_read_updated_at.
 *   Returns true only when a new Suggested category was inserted.
 * - p_category_id null: failure path. Increments tag_attempts under the same guard and sets
 *   tagging_gave_up_at at 3. Returns false.
 */
export interface SaveAiTagArgs {
  entryId: string;
  readUpdatedAt: string;
  categoryId: string | null;
  proposedName: string | null;
  proposedDescription: string | null;
}

export interface TagDb {
  /** `untagged_due()`: oldest first, max 20, created over 2 min ago, not given up. */
  untaggedDue(): Promise<{ id: string }[]>;
  getEntry(id: string): Promise<EntryRow | null>;
  getCategories(userId: string): Promise<CategoryRow[]>;
  saveAiTag(args: SaveAiTagArgs): Promise<boolean>;
}
