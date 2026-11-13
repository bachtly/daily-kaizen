import type { ActivityRow, SlotRow } from './db';
import type { Database } from './database.types';
import { ownedSegments, type WeekEntry } from './week';

type Entry = Database['public']['Tables']['entries']['Row'];

export const MAX_CHIPS = 3;
/** Label of the row for Entries without an Activity (AC-8.5). */
export const NO_ACTIVITY = '(no Activity)';

/**
 * Up to 3 Activity chips for a sheet starting at a weekday and hour (AC-8.4): the Active Activities most used in that slot,
 * filled up with the most used overall. Merged Activities never show. Ties break by name, so the order is stable.
 * `weekday`: 0 = Monday (as `zonedParts`); `hour`: 0-23, both in the Entry's own zone.
 */
export function activityChips(
  slots: readonly SlotRow[],
  activities: readonly ActivityRow[],
  weekday: number,
  hour: number,
): ActivityRow[] {
  const dow = (weekday + 1) % 7; // slots use Postgres dow: 0 = Sunday
  const active = new Map(activities.filter((a) => a.status === 'active').map((a) => [a.id, a]));
  const here = new Map<string, number>();
  const overall = new Map<string, number>();
  for (const s of slots) {
    if (!active.has(s.activity_id)) continue;
    overall.set(s.activity_id, (overall.get(s.activity_id) ?? 0) + s.n);
    if (s.dow === dow && s.hour === hour) here.set(s.activity_id, (here.get(s.activity_id) ?? 0) + s.n);
  }
  const ranked = (counts: Map<string, number>) =>
    [...counts]
      .sort(([a, x], [b, y]) => y - x || active.get(a)!.name.localeCompare(active.get(b)!.name))
      .map(([id]) => id);
  const ids = [...new Set([...ranked(here), ...ranked(overall)])].slice(0, MAX_CHIPS);
  return ids.map((id) => active.get(id)!);
}

export type ActivityEntry = WeekEntry & Partial<Pick<Entry, 'activity_id'>> & { activity_ids?: string[] };

/** The Entry's distinct Activities; falls back to the single `activity_id` for a copy that has no list yet. */
function activitiesOf(entry: ActivityEntry): string[] {
  const ids = entry.activity_ids ?? (entry.activity_id ? [entry.activity_id] : []);
  return [...new Set(ids)];
}

export type ActivityTotal = {
  /** null = Entries with no Activity */
  activityId: string | null;
  totalMs: number;
  /** ms per Category id */
  byCategory: Record<string, number>;
  /** ms with no Category */
  untaggedMs: number;
};

/**
 * Time per Activity, split by Category, for one week (AC-8.5), counted as in AC-5.1: past time only (to `now`, default the
 * window end), an Entry crossing a boundary counts its part inside, overlaps count once for the Entry created last.
 * An Entry with several Activities splits its time equally among them (1 h with two = 30 min each), so the rows add up
 * to the logged time (#79). Largest first; the "(no Activity)" row (`activityId` null) comes last and only when it has time. Unlogged time is not here.
 */
export function activityTotals(
  entries: readonly ActivityEntry[],
  bounds: { start: number; end: number },
  now: number = bounds.end,
): ActivityTotal[] {
  const rows = new Map<string | null, ActivityTotal>();
  for (const { ms, entry } of ownedSegments(entries, bounds.start, Math.min(bounds.end, now))) {
    const ids = activitiesOf(entry);
    const keys: (string | null)[] = ids.length ? ids : [null];
    const share = ms / keys.length;
    for (const key of keys) {
      let row = rows.get(key);
      if (!row) rows.set(key, (row = { activityId: key, totalMs: 0, byCategory: {}, untaggedMs: 0 }));
      row.totalMs += share;
      if (entry.category_id) row.byCategory[entry.category_id] = (row.byCategory[entry.category_id] ?? 0) + share;
      else row.untaggedMs += share;
    }
  }
  const none = rows.get(null);
  rows.delete(null);
  const sorted = [...rows.values()].sort((a, b) => b.totalMs - a.totalMs);
  return none ? [...sorted, none] : sorted;
}
