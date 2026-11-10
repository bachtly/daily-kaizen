import type { Database } from './database.types';
import { startOfZonedDay, weekTotals, zonedParts, type WeekEntry } from './week';

type Entry = Database['public']['Tables']['entries']['Row'];

/** Shortest Unlogged slot shown on the Day view (05-ui D5). */
export const SLOT_MIN_MS = 10 * 60_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** The zone's calendar date (`YYYY-MM-DD`) of an instant. */
export function dateOf(ms: number, tz: string): string {
  const p = zonedParts(ms, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** `date` moved by `days` calendar days. */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 00:00 of `date` to 00:00 of the next day in the zone (ms). Handles 23 h and 25 h days. */
export function dayBounds(date: string, tz: string): { start: number; end: number } {
  const [y, m, d] = date.split('-').map(Number);
  const [ny, nm, nd] = shiftDate(date, 1).split('-').map(Number);
  return { start: startOfZonedDay(y, m, d, tz), end: startOfZonedDay(ny, nm, nd, tz) };
}

/** Logged time on one day: past time covered by an Entry, overlaps counted once (as AC-5.1). */
export function loggedMs(entries: readonly WeekEntry[], bounds: { start: number; end: number }, now: number): number {
  const t = weekTotals(entries, bounds, now);
  return t.elapsedMs - t.unloggedMs;
}

export type DayItem<E> = { kind: 'entry'; entry: E } | { kind: 'slot'; start: number; end: number };

/**
 * A day's Entries in start order, with its Unlogged slots between them (AC-1.4):
 * at least `minMs` between two Entries, and, today only, from the last Entry to now.
 * Time before a past day's first Entry and after its last is not a slot (usually sleep).
 * A day with no Entries is one slot from 00:00 to the end of the day, or to now today.
 */
export function dayItems<E extends Pick<Entry, 'started_at' | 'ended_at'>>(
  entries: readonly E[],
  bounds: { start: number; end: number },
  now: number,
  minMs = SLOT_MIN_MS,
): DayItem<E>[] {
  const limit = Math.min(bounds.end, now);
  const day = entries
    .filter((e) => Date.parse(e.started_at) < bounds.end && Date.parse(e.ended_at) > bounds.start)
    .sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at));
  if (day.length === 0) return limit > bounds.start ? [{ kind: 'slot', start: bounds.start, end: limit }] : [];

  const out: DayItem<E>[] = [];
  let reach: number | null = null;
  for (const e of day) {
    const s = Math.max(Date.parse(e.started_at), bounds.start);
    if (reach !== null && s - reach >= minMs) out.push({ kind: 'slot', start: reach, end: s });
    out.push({ kind: 'entry', entry: e });
    reach = Math.max(reach ?? -Infinity, Math.min(Date.parse(e.ended_at), bounds.end));
  }
  const isToday = now >= bounds.start && now < bounds.end;
  if (isToday && reach !== null && now - reach >= minMs) out.push({ kind: 'slot', start: reach, end: now });
  return out;
}

export type Segment = { start: number; end: number; categoryId: string | null };

/** Covered stretches of the day for the coverage bar, each owned by the Entry created last (as AC-5.1). */
export function coverage(entries: readonly WeekEntry[], bounds: { start: number; end: number }, now: number): Segment[] {
  const winEnd = Math.min(bounds.end, now);
  const clipped = entries
    .map((e) => ({ s: Math.max(Date.parse(e.started_at), bounds.start), e: Math.min(Date.parse(e.ended_at), winEnd), created: Date.parse(e.created_at), cat: e.category_id }))
    .filter((c) => c.e > c.s);
  const points = [...new Set(clipped.flatMap((c) => [c.s, c.e]))].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    let owner: (typeof clipped)[number] | undefined;
    for (const c of clipped) if (c.s <= a && c.e >= b && (!owner || c.created > owner.created)) owner = c;
    if (!owner) continue;
    const last = out[out.length - 1];
    if (last && last.end === a && last.categoryId === owner.cat) last.end = b;
    else out.push({ start: a, end: b, categoryId: owner.cat });
  }
  return out;
}
