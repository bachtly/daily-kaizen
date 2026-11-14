import type { Id, Role, WeekFacts } from "../_shared/facts.ts";
import type { Metric } from "./types.ts";

/** Hours for a card: one decimal, no trailing ".0" ("6h", "6.5h"). */
export const fmtH = (min: number) => `${Math.round(min / 6) / 10}h`;
/** Local clock for an hour of the day ("21:00"). */
export const clock = (h: number) => `${String(((h % 24) + 24) % 24).padStart(2, "0")}:00`;
export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Minutes of the given Categories in hour cells before `upto`, optionally only some hours of the day. */
export function cellMinutes(f: WeekFacts, cats: (Id | undefined)[], upto = 168, hours?: number[]): number {
  let sum = 0;
  for (let c = 0; c < Math.min(upto, f.hours.length); c++) {
    if (hours && !hours.includes(c % 24)) continue;
    for (const id of cats) if (id) sum += f.hours[c].cat[id] ?? 0;
  }
  return sum;
}

/** The metric's value in one week (full week unless `upto` limits the hour cells). */
export function measure(m: Metric, f: WeekFacts, roles: Partial<Record<Role, Id>>, upto = 168): number {
  switch (m.fn) {
    case "category_minutes_in_hours":
      return cellMinutes(f, m.roles.map((r) => roles[r]), upto, m.hours);
    case "deep_short_block_minutes":
      return f.deepBlocks.filter((b) => b.min < m.under).reduce((a, b) => a + b.min, 0);
    case "deep_waste_share": {
      if (!f.deepBlocks.length) return 0;
      return Math.round((100 * f.deepBlocks.filter((b) => b.next === "waste").length) / f.deepBlocks.length);
    }
    case "short_entries":
      return f.shortEntries[m.activity_id]?.count ?? 0;
    case "target_actual": {
      const row = f.byActivity[m.activity_id];
      if (!row) return 0;
      return m.category_id ? row.byCategory[m.category_id] ?? 0 : row.total;
    }
    case "short_nights":
      return f.nights.filter((n) => n.sleepMin < m.under).length;
    case "days_recovery_under":
      return f.days.filter((d) => d.logged && d.recoveryAwake < m.under).length;
    case "category_minutes":
      return cellMinutes(f, [roles[m.role]], upto);
  }
}

/** Lower is better, for any metric: comparable across weeks. */
export function badness(m: Metric, value: number): number {
  if (m.fn === "category_minutes") return Math.abs(value - m.target);
  return m.better === "higher" ? -value : value;
}

export const USUAL_MIN_WEEKS = 3;
export const USUAL_MAX_WEEKS = 8;
export const ELIGIBLE_LOGGED_DAYS = 5;

/** "My usual": earlier weeks with ≥ 5 logged days (newest first, up to 8). Null with fewer than 3. */
export function usual(history: WeekFacts[], value: (f: WeekFacts) => number) {
  const weeks = history.filter((w) => w.loggedDays >= ELIGIBLE_LOGGED_DAYS).slice(0, USUAL_MAX_WEEKS);
  if (weeks.length < USUAL_MIN_WEEKS) return null;
  const xs = weeks.map(value);
  return { median: median(xs), lo: Math.min(...xs), hi: Math.max(...xs), weeks: xs.length };
}
