import Dexie, { type EntityTable } from 'dexie';
import type { Database } from './database.types';

type Tables = Database['public']['Tables'];

/** Columns the refresh reads (04-api Local copy refresh). */
export const ENTRY_COLUMNS =
  'id, text, started_at, ended_at, time_zone, category_id, tag_source, suggested_category_id, tagging_gave_up_at, created_at' as const;
export const CATEGORY_COLUMNS = 'id, name, description, status' as const;
export const SETTINGS_COLUMNS = 'time_zone, quiet_start, quiet_end' as const;
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
>;
export type CategoryRow = Pick<Tables['categories']['Row'], 'id' | 'name' | 'description' | 'status'>;
export type SettingsRow = Pick<Tables['settings']['Row'], 'time_zone' | 'quiet_start' | 'quiet_end'>;
export type ReviewRow = Pick<Tables['weekly_reviews']['Row'], 'week_start'>;

export type MetaRow = { key: string; value: unknown };

/** The Local copy: read-only on the phone, replaced whole by each refresh. Disposable (no migrations). */
export class LocalDb extends Dexie {
  entries!: EntityTable<EntryRow, 'id'>;
  categories!: EntityTable<CategoryRow, 'id'>;
  // one row, key 'me'
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
  }
}

export const db = new LocalDb();
