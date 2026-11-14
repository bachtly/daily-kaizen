// Week and zone arithmetic shared by the phone (app/src/data/week.ts re-exports it) and the Edge Functions,
// so the Week page, the heatmap and Insights (#80) split time the same way. Pure TypeScript, no imports:
// it must run in Vite and in Deno.

/** The Entry fields the week rules read (a subset of the entries row). */
export type WeekEntry = {
  id: string;
  started_at: string;
  ended_at: string;
  created_at: string;
  category_id: string | null;
};


const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    formatters.set(tz, f);
  }
  return f;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Calendar fields of an instant in a time zone. `weekday`: 0 = Monday. */
export function zonedParts(ms: number, tz: string) {
  const p: Record<string, string> = {};
  for (const { type, value } of formatter(tz).formatToParts(ms)) p[type] = value;
  return {
    year: +p.year,
    month: +p.month,
    day: +p.day,
    hour: +p.hour,
    minute: +p.minute,
    second: +p.second,
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

/** Offset (zone minus UTC) in ms at an instant. */
function offsetAt(ms: number, tz: string): number {
  const p = zonedParts(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** The instant at which a zone's wall clock reads y-m-d 00:00 (first such instant when a DST gap swallows midnight). */
export function startOfZonedDay(year: number, month: number, day: number, tz: string): number {
  const wall = Date.UTC(year, month - 1, day);
  // Try both offsets around the day; pick the earliest instant whose wall time is >= midnight of that day.
  const candidates = [wall - offsetAt(wall - 14 * 3600_000, tz), wall - offsetAt(wall + 14 * 3600_000, tz)];
  const valid = candidates.filter((c) => {
    const p = zonedParts(c, tz);
    return p.year === year && p.month === month && p.day === day && p.hour === 0 && p.minute === 0;
  });
  if (valid.length) return Math.min(...valid);
  // Midnight does not exist (DST gap): the first instant of the day is the instant after the gap.
  return Math.max(...candidates);
}

/** Start of the zone's day containing `ms`. */
export function startOfDay(ms: number, tz: string): number {
  const p = zonedParts(ms, tz);
  return startOfZonedDay(p.year, p.month, p.day, tz);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Monday (`YYYY-MM-DD`) of the zone's week containing `ms`. */
export function mondayOf(ms: number, tz: string): string {
  const p = zonedParts(ms, tz);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day - p.weekday));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Monday 00:00 to next Monday 00:00 in the zone (ms). Handles 23 h and 25 h days. */
export function weekBounds(monday: string, tz: string): { start: number; end: number } {
  const [y, m, d] = monday.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 7));
  return {
    start: startOfZonedDay(y, m, d, tz),
    end: startOfZonedDay(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), tz),
  };
}

export type WeekTotals = {
  /** ms per category id; only categories with time */
  byCategory: Record<string, number>;
  untaggedMs: number;
  unloggedMs: number;
  /** elapsed ms in the window (past time only) */
  elapsedMs: number;
};

/**
 * Covered time in [winStart, winEnd) cut into pieces, each owned by one Entry: an Entry crossing a boundary counts its part
 * inside; overlapping time belongs to the Entry created last (AC-5.1). Shared by the Category and Activity totals.
 */
export function ownedSegments<E extends WeekEntry>(
  entries: readonly E[],
  winStart: number,
  winEnd: number,
): { ms: number; entry: E }[] {
  const clipped = entries
    .map((entry) => ({
      s: Math.max(Date.parse(entry.started_at), winStart),
      e: Math.min(Date.parse(entry.ended_at), winEnd),
      created: Date.parse(entry.created_at),
      entry,
    }))
    .filter((c) => c.e > c.s);
  const points = [...new Set([winStart, winEnd, ...clipped.flatMap((c) => [c.s, c.e])])].sort((a, b) => a - b);
  const out: { ms: number; entry: E }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    let owner: (typeof clipped)[number] | undefined;
    for (const c of clipped) {
      if (c.s <= a && c.e >= b && (!owner || c.created > owner.created)) owner = c;
    }
    if (owner) out.push({ ms: b - a, entry: owner.entry });
  }
  return out;
}

/**
 * Time per Category, Untagged and Unlogged for one week (AC-5.1).
 * Only past time counts (window ends at `now`); an Entry crossing a boundary counts its part inside;
 * overlapping time counts once, for the Entry created last.
 */
export function weekTotals(
  entries: readonly WeekEntry[],
  bounds: { start: number; end: number },
  now: number,
): WeekTotals {
  const winStart = bounds.start;
  const winEnd = Math.min(bounds.end, now);
  const out: WeekTotals = { byCategory: {}, untaggedMs: 0, unloggedMs: 0, elapsedMs: Math.max(0, winEnd - winStart) };
  if (out.elapsedMs === 0) return out;

  let covered = 0;
  for (const { ms, entry } of ownedSegments(entries, winStart, winEnd)) {
    covered += ms;
    if (entry.category_id) out.byCategory[entry.category_id] = (out.byCategory[entry.category_id] ?? 0) + ms;
    else out.untaggedMs += ms;
  }
  out.unloggedMs = out.elapsedMs - covered;
  return out;
}

