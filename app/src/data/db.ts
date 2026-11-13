import Dexie, { type EntityTable, type Table } from 'dexie';
import type { Database } from './database.types';

type Tables = Database['public']['Tables'];

/** Columns the refresh reads (04-api Local copy refresh). */
export const ENTRY_COLUMNS =
  'id, text, started_at, ended_at, time_zone, category_id, tag_source, activity_source, suggested_category_id, tagging_gave_up_at, created_at, entry_activities(activity_id, created_at)' as const;
export const CATEGORY_COLUMNS = 'id, name, description, status' as const;
export const ACTIVITY_COLUMNS = 'id, name, status, merged_into_id' as const;
export const SETTINGS_COLUMNS = 'time_zone, quiet_start, quiet_end, nudge_gap_hours' as const;
export const REVIEW_COLUMNS = 'week_start, next_change' as const;
export const TARGET_COLUMNS = 'id, activity_id, category_id, minutes' as const;

export type EntryRow = Pick<
  Tables['entries']['Row'],
  | 'id'
  | 'text'
  | 'started_at'
  | 'ended_at'
  | 'time_zone'
  | 'category_id'
  | 'tag_source'
  | 'suggested_category_id'
  | 'tagging_gave_up_at'
  | 'created_at'
> &
  // Optional until the UI fixtures and `useLocalCopy` carry them (they live in app/src/ui); a refresh always stores them.
  Partial<Pick<Tables['entries']['Row'], 'activity_source'>> & {
    /** The Entry's Activities (0 to 3), oldest first */
    activity_ids?: string[];
  };
/** What the Entry select returns: the Entry and its `entry_activities` rows. */
export type EntryWithLinks = Omit<EntryRow, 'activity_ids'> & {
  entry_activities?: { activity_id: string; created_at: string }[] | null;
};
/** Turn the embedded rows into `activity_ids`, in the order they were added (ties by id), without repeats. */
export function toEntryRow({ entry_activities, ...entry }: EntryWithLinks): EntryRow {
  const links = [...(entry_activities ?? [])].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.activity_id.localeCompare(b.activity_id),
  );
  return { ...entry, activity_ids: [...new Set(links.map((l) => l.activity_id))] };
}
export type CategoryRow = Pick<Tables['categories']['Row'], 'id' | 'name' | 'description' | 'status'>;
export type ActivityRow = Pick<Tables['activities']['Row'], 'id' | 'name' | 'status' | 'merged_into_id'>;
/** One `activity_slots()` row: Entries with an Activity at a weekday (0 = Sunday) and hour over 12 weeks. */
export type SlotRow = Database['public']['Functions']['activity_slots']['Returns'][number];
export type SettingsRow = Pick<Tables['settings']['Row'], 'time_zone' | 'quiet_start' | 'quiet_end' | 'nudge_gap_hours'>;
export type ReviewRow = Pick<Tables['weekly_reviews']['Row'], 'week_start'> & Partial<Pick<Tables['weekly_reviews']['Row'], 'next_change'>>;
/** A weekly target (minutes) for an Activity; `category_id` null = any Category. */
export type TargetRow = Pick<Tables['activity_targets']['Row'], 'id' | 'activity_id' | 'category_id' | 'minutes'>;

export type MetaRow = { key: string; value: unknown };

/** The Local copy: read-only on the phone, replaced whole by each refresh. Disposable (no migrations). */
export class LocalDb extends Dexie {
  entries!: EntityTable<EntryRow, 'id'>;
  categories!: EntityTable<CategoryRow, 'id'>;
  // one row, key 'me'
  activities!: EntityTable<ActivityRow, 'id'>;
  activity_slots!: Table<SlotRow, [string, number, number]>;
  settings!: EntityTable<SettingsRow & { key: string }, 'key'>;
  activity_targets!: EntityTable<TargetRow, 'id'>;
  weekly_reviews!: EntityTable<ReviewRow, 'week_start'>;
  meta!: EntityTable<MetaRow, 'key'>;

  constructor(name = 'daily-kaizen') {
    super(name);
    this.version(1).stores({
      entries: 'id, started_at, ended_at',
      categories: 'id',
      settings: 'key',
      weekly_reviews: 'week_start',
      meta: 'key',
    });
    // v2: Activities (Active and merged) and the chip counts
    this.version(2).stores({
      activities: 'id',
      activity_slots: '[activity_id+dow+hour]',
    });
    // v3: weekly targets per Activity (the Reviews keep their key; `next_change` is just another field)
    this.version(3).stores({
      activity_targets: 'id',
    });
  }
}

export const db = new LocalDb();
