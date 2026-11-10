import type { EntryRow } from '../data/db';
import { zonedParts } from '../data/week';

const MINUTE = 60_000;

/** "12h 30m" (minutes rounded). */
export function formatDuration(ms: number): string {
  const m = Math.round(ms / MINUTE);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

const KNOWN = ['deep', 'shallow', 'maintenance', 'recovery', 'waste'];
/** Fixed muted colour per Category; new Categories share one. */
export const categoryColour = (name: string) => `var(--cat-${KNOWN.includes(name.toLowerCase()) ? name.toLowerCase() : 'new'})`;

/** HH:MM wall-clock time of an instant in a zone. */
export const hhmm = (ms: number, tz: string) => {
  const p = zonedParts(ms, tz);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
};

/** Move `ms` to the wall-clock time `value` (HH:MM) on the same day in the zone. */
export const withTime = (ms: number, value: string, tz: string) => {
  const [h, m] = value.split(':').map(Number);
  const p = zonedParts(ms, tz);
  return ms + ((h - p.hour) * 60 + (m - p.minute)) * MINUTE - p.second * 1000;
};

const DAY = 24 * 60 * MINUTE;

/**
 * The most recent wall-clock time `value` (HH:MM) at or before `limit` (strictly before it if `strict`):
 * that day's if it is not later, else the day before's. Lets the Log form backfill last night (#46).
 */
export const latestAt = (limit: number, value: string, tz: string, strict = false) => {
  const t = withTime(limit, value, tz);
  return t > limit || (strict && t === limit) ? withTime(limit - DAY, value, tz) : t;
};

/** Which day `ms` is on, when it isn't today: "yesterday", else a short date like "Mon 9". */
export const dayHint = (ms: number, now: number, tz: string) => {
  const key = (t: number) => { const p = zonedParts(t, tz); return `${p.year}-${p.month}-${p.day}`; };
  if (key(ms) === key(now)) return undefined;
  if (key(ms) === key(now - DAY)) return 'yesterday';
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric' }).format(ms);
};

/**
 * Entries that approving each Suggested category would move (AC-4.2: not those I tagged myself), by category id.
 * Counts the Local copy only (this and last week), while approving moves every matching Entry, so an old suggestion can be undercounted: accepted, the card is a hint.
 */
export function countMoves(entries: readonly Pick<EntryRow, 'suggested_category_id' | 'tag_source'>[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    if (e.suggested_category_id && e.tag_source !== 'me') counts[e.suggested_category_id] = (counts[e.suggested_category_id] ?? 0) + 1;
  }
  return counts;
}
