import Dexie, { type EntityTable, type Table } from 'dexie';
import type { Database } from './database.types';

type Tables = Database['public']['Tables'];

/** Columns the refresh reads (04-api Local copy refresh). */
export const ENTRY_COLUMNS =
  'id, text, started_at, ended_at, time_zone, category_id, tag_source, activity_id, activity_source, suggested_category_id, tagging_gave_up_at, created_at' as const;
export const CATEGORY_COLUMNS = 'id, name, description, status' as const;
export const ACTIVITY_COLUMNS = 'id, name, status, merged_into_id' as const;
export const SETTINGS_COLUMNS = 'time_zone, quiet_start, quiet_end, nudge_gap_hours' as const;
export const REVIEW_COLUMNS = 'week_start' as const;

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
  // Optional until the UI fixtures and `useLocalCopy` carry them (they live in app/src/ui); a refresh always stores both.
  Partial<Pick<Tables['entries']['Row'], 'activity_id' | 'activity_source'>>;
export type CategoryRow = Pick<Tables['categories']['Row'], 'id' | 'name' | 'description' | 'status'>;
export type ActivityRow = Pick<Tables['activities']['Row'], 'id' | 'name' | 'status' | 'merged_into_id'>;
/** One `activity_slots()` row: Entries with an Activity at a weekday (0 = Sunday) and hour over 12 weeks. */
export type SlotRow = Database['public']['Functions']['activity_slots']['Returns'][number];
export type SettingsRow = Pick<Tables['settings']['Row'], 'time_zone' | 'quiet_start' | 'quiet_end' | 'nudge_gap_hours'>;
export type ReviewRow = Pick<Tables['weekly_reviews']['Row'], 'week_start'>;

export type MetaRow = { key: string; value: unknown };

/** The Local copy: read-only on the phone, replaced whole by each refresh. Disposable (no migrations). */
export class LocalDb extends Dexie {
  entries!: EntityTable<EntryRow, 'id'>;
  categories!: EntityTable<CategoryRow, 'id'>;
  // one row, key 'me'
  activities!: EntityTable<ActivityRow, 'id'>;
  activity_slots!: Table<SlotRow, [string, number, number]>;
  settings!: EntityTable<SettingsRow & { key: string }, 'key'>;
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
  }
}

export const db = new LocalDb();
