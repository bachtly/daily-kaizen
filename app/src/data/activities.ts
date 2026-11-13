import type { ActivityRow, ReviewRow, SlotRow, TargetRow } from './db';
import { ownedSegments, type WeekEntry } from './week';

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

export type ActivityEntry = WeekEntry & { activity_ids?: string[] };

/** The Entry's distinct Activities. */
function activitiesOf(entry: ActivityEntry): string[] {
  return [...new Set(entry.activity_ids ?? [])];
}

export type ActivityTotal = {
  /** null = Entries with no Activity */
  activityId: string | null;
  totalMs: number;
  /** ms per Category id */
  byCategory: Record<string, number>;
  /** ms with no Category */
  untaggedMs: number;
  /** The weekly target for this Activity in any Category, in ms; null = none */
  targetMs: number | null;
  /** Weekly targets narrowed to one Category, ms per Category id */
  categoryTargetMs: Record<string, number>;
};

/**
 * Time per Activity, split by Category, for one week (AC-8.5), counted as in AC-5.1: past time only (to `now`, default the
 * window end), an Entry crossing a boundary counts its part inside, overlaps count once for the Entry created last.
 * An Entry with several Activities splits its time equally among them (1 h with two = 30 min each), so the rows add up
 * to the logged time (#79). With `targets`, each row carries its targets, and an Activity with a target but no time this
 * week is listed at 0, so a missed target shows. Largest first, ties by Activity id; the "(no Activity)" row (`activityId` null) comes last and only when it has time. Unlogged time is not here.
 */
export function activityTotals(
  entries: readonly ActivityEntry[],
  bounds: { start: number; end: number },
  now: number = bounds.end,
  targets: readonly TargetRow[] = [],
): ActivityTotal[] {
  const rows = new Map<string | null, ActivityTotal>();
  const blank = (activityId: string | null): ActivityTotal => ({
    activityId, totalMs: 0, byCategory: {}, untaggedMs: 0, targetMs: null, categoryTargetMs: {},
  });
  for (const { ms, entry } of ownedSegments(entries, bounds.start, Math.min(bounds.end, now))) {
    const ids = activitiesOf(entry);
    const keys: (string | null)[] = ids.length ? ids : [null];
    const share = ms / keys.length;
    for (const key of keys) {
      let row = rows.get(key);
      if (!row) rows.set(key, (row = blank(key)));
      row.totalMs += share;
      if (entry.category_id) row.byCategory[entry.category_id] = (row.byCategory[entry.category_id] ?? 0) + share;
      else row.untaggedMs += share;
    }
  }
  for (const t of targets) {
    let row = rows.get(t.activity_id);
    if (!row) rows.set(t.activity_id, (row = blank(t.activity_id)));
    if (t.category_id) row.categoryTargetMs[t.category_id] = t.minutes * 60_000;
    else row.targetMs = t.minutes * 60_000;
  }
  const none = rows.get(null);
  rows.delete(null);
  const sorted = [...rows.values()].sort((a, b) => b.totalMs - a.totalMs || a.activityId!.localeCompare(b.activityId!));
  return none ? [...sorted, none] : sorted;
}

/** The note ("one change for next week") saved when the review of the week before `monday` (YYYY-MM-DD) was marked done; null when none. */
export function lastWeekNote(reviews: readonly ReviewRow[], monday: string): string | null {
  const [y, m, d] = monday.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 7)).toISOString().slice(0, 10);
  return reviews.find((r) => r.week_start === prev)?.next_change?.trim() || null;
}
