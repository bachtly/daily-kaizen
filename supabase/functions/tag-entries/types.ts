export interface EntryRow {
  id: string;
  user_id: string;
  text: string;
  updated_at: string;
  category_id: string | null;
  tag_source: string | null;
  activity_source: string | null;
  tagging_gave_up_at: string | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  description: string;
  status: "active" | "suggested" | "rejected";
}

/** One of my own corrections: an Entry where I set a label (source me), newest first from the db. */
export interface CorrectionRow {
  text: string;
  tag_source: string | null;
  activity_source: string | null;
  category_name: string | null;
  /** Already the merge target's name for a merged Activity; null = none. */
  activity_name: string | null;
}

export interface TagReply {
  category_name: string;
  proposed: { name: string; description: string } | null;
  /** A listed Active name, an alias, a new name, or null for none (#57). */
  activity_name: string | null;
}

/**
 * Arguments of the `save_ai_labels()` database helper (service_role only; db-activities).
 *   save_ai_labels(p_entry_id uuid, p_read_updated_at timestamptz, p_category_id uuid,
 *                  p_proposed_name text, p_proposed_description text, p_activity_name text)
 *   returns boolean
 * - one tx; the Category part runs only when p_category_id is not null and tag_source isn't 'me'
 *   (inserts the Suggested category if proposed and new); the Activity part runs only when
 *   activity_source isn't 'me' and sets activity_source 'ai' with the resolved id (null name = none).
 *   Both guarded by updated_at = p_read_updated_at. Returns true only when a new Suggested
 *   category was inserted.
 * Failure path is separate:
 *   record_tag_failure(p_entry_id uuid, p_read_updated_at timestamptz) returns void
 *   (guarded attempts+1, sets tagging_gave_up_at at 3).
 */
export interface SaveAiLabelsArgs {
  entryId: string;
  readUpdatedAt: string;
  /** null = leave the Category alone (already set, or set by me). */
  categoryId: string | null;
  proposedName: string | null;
  proposedDescription: string | null;
  activityName: string | null;
}

export interface TagDb {
  /** `untagged_due()`: Entries missing a label, oldest first, max 20, created over 2 min ago, not given up. */
  untaggedDue(): Promise<{ id: string }[]>;
  getEntry(id: string): Promise<EntryRow | null>;
  getCategories(userId: string): Promise<CategoryRow[]>;
  /** Names of the user's Active Activities. */
  getActiveActivityNames(userId: string): Promise<string[]>;
  /** The user's newest Entries with a `me` label, newest first (max 100), for prompt examples. */
  getCorrections(userId: string): Promise<CorrectionRow[]>;
  saveAiLabels(args: SaveAiLabelsArgs): Promise<boolean>;
  recordTagFailure(entryId: string, readUpdatedAt: string): Promise<void>;
}
