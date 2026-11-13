import {
  ACTIVITY_COLUMNS,
  CATEGORY_COLUMNS,
  db,
  ENTRY_COLUMNS,
  REVIEW_COLUMNS,
  SETTINGS_COLUMNS,
  type ActivityRow,
  type CategoryRow,
  type EntryRow,
  type ReviewRow,
  type SettingsRow,
  type SlotRow,
} from './db';
import { emitCopyChanged } from './copyChanged';
import type { ErrorKey } from './errors';
import { request, type Result } from './request';
import { supabase } from './supabase';
import { recordTiming } from './timings';

const SETTINGS_KEY = 'me';
const REFRESHED_AT = 'refreshed_at';

export type LocalCopy = {
  entries: EntryRow[];
  categories: CategoryRow[];
  /** All of mine, Active and merged; `readLocalCopy` always fills it (optional only until the UI's empty copy does) */
  activities?: ActivityRow[];
  /** `activity_slots()` rows for the chips; same note */
  slots?: SlotRow[];
  settings: SettingsRow | null;
  reviews: ReviewRow[];
  /** ISO time of the last successful refresh; null when there is no Local copy yet */
  refreshedAt: string | null;
};

/** What a refresh reads from: Entries ending after `since` (previous Monday 00:00, ISO) and Reviews from `sinceDate` (YYYY-MM-DD). */
export type RefreshWindow = { since: string; sinceDate: string };

let inFlight: Promise<Result<{ refreshedAt: string }>> | null = null;

/**
 * Six reads in parallel (04-api); the Local copy is replaced, in one transaction, only when all six succeed.
 * Concurrent calls share one refresh. Records the duration (success only) for the NFR-3 report.
 */
export function refresh(window: RefreshWindow): Promise<Result<{ refreshedAt: string }>> {
  inFlight ??= doRefresh(window).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRefresh({ since, sinceDate }: RefreshWindow): Promise<Result<{ refreshedAt: string }>> {
  const started = performance.now();
  const [entries, categories, activities, slots, settings, reviews] = await Promise.all([
    request((signal) =>
      supabase.from('entries').select(ENTRY_COLUMNS).gt('ended_at', since).order('started_at').abortSignal(signal),
    ),
    request((signal) => supabase.from('categories').select(CATEGORY_COLUMNS).abortSignal(signal)),
    request((signal) => supabase.from('activities').select(ACTIVITY_COLUMNS).abortSignal(signal)),
    request((signal) => supabase.rpc('activity_slots').abortSignal(signal)),
    request((signal) => supabase.from('settings').select(SETTINGS_COLUMNS).abortSignal(signal)),
    request((signal) =>
      supabase.from('weekly_reviews').select(REVIEW_COLUMNS).gte('week_start', sinceDate).abortSignal(signal),
    ),
  ]);
  if (!entries.ok) return entries;
  if (!categories.ok) return categories;
  if (!activities.ok) return activities;
  if (!slots.ok) return slots;
  if (!settings.ok) return settings;
  if (!reviews.ok) return reviews;

  const refreshedAt = new Date().toISOString();
  try {
    await db.transaction('rw', [db.entries, db.categories, db.activities, db.activity_slots, db.settings, db.weekly_reviews, db.meta], async () => {
      await Promise.all([
        db.entries.clear(),
        db.categories.clear(),
        db.activities.clear(),
        db.activity_slots.clear(),
        db.settings.clear(), db.weekly_reviews.clear(),
      ]);
      await db.entries.bulkPut(entries.data);
      await db.categories.bulkPut(categories.data);
      await db.activities.bulkPut(activities.data);
      await db.activity_slots.bulkPut(slots.data);
      if (settings.data[0]) await db.settings.put({ key: SETTINGS_KEY, ...settings.data[0] });
      await db.weekly_reviews.bulkPut(reviews.data);
      await db.meta.put({ key: REFRESHED_AT, value: refreshedAt });
    });
  } catch {
    // Storage failed (full, blocked): the old copy stays as it was (transaction rolled back).
    return { ok: false, error: 'unknown' satisfies ErrorKey };
  }
  emitCopyChanged();
  await recordTiming('refresh', performance.now() - started).catch(() => {});
  return { ok: true, data: { refreshedAt } };
}

/** Read everything the screens need from the Local copy. */
export async function readLocalCopy(): Promise<LocalCopy> {
  const [entries, categories, activities, slots, settings, reviews, refreshedAt] = await Promise.all([
    db.entries.orderBy('started_at').toArray(),
    db.categories.toArray(),
    db.activities.toArray(),
    db.activity_slots.toArray(),
    db.settings.get(SETTINGS_KEY),
    db.weekly_reviews.toArray(),
    db.meta.get(REFRESHED_AT),
  ]);
  return {
    entries,
    categories,
    activities,
    slots,
    settings: settings ? { time_zone: settings.time_zone, quiet_start: settings.quiet_start, quiet_end: settings.quiet_end, nudge_gap_hours: settings.nudge_gap_hours } : null,
    reviews,
    refreshedAt: (refreshedAt?.value as string | undefined) ?? null,
  };
}

/** Ask the browser not to evict the Local copy. Best effort; returns whether storage is persistent. */
export async function persist(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/**
 * Report the phone's IANA time zone (`{time_zone}` only), so scheduled jobs use it (AC-2.3).
 * Filtered by the signed-in user's id: PostgREST (pg_safeupdate) refuses an UPDATE with no WHERE.
 */
export async function reportTimeZone(timeZone: string): Promise<Result<unknown>> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return { ok: false, error: 'session_lost' };
  return request((signal) =>
    supabase.from('settings').update({ time_zone: timeZone }).eq('user_id', userId).abortSignal(signal),
  );
}

/** On app open or foreground: ask for persistence, report the time zone, then refresh. */
export async function onOpen(window: RefreshWindow, timeZone: string) {
  void persist();
  await reportTimeZone(timeZone); // a failure here must not block the refresh
  return refresh(window);
}

/** An earlier week: same Entry read bounded by the week; shown but not stored. `start`/`end` are ISO. */
export function fetchWeek(range: { start: string; end: string }): Promise<Result<EntryRow[]>> {
  return request((signal) =>
    supabase
      .from('entries')
      .select(ENTRY_COLUMNS)
      .gt('ended_at', range.start)
      .lt('started_at', range.end)
      .order('started_at')
      .abortSignal(signal),
  );
}
