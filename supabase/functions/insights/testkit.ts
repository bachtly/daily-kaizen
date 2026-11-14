// Test helpers: hand-built week facts and contexts (not shipped logic).
import type { WeekFacts } from "../_shared/facts.ts";
import type { DetectContext } from "./types.ts";

export const ROLES = { deep: "deep", shallow: "shallow", maintenance: "maint", recovery: "rec", waste: "waste" };

export function blank(weekStart = "2026-11-02", asOf = "2026-11-08T18:00:00.000Z", loggedDays = 7): WeekFacts {
  const [y, m, d] = weekStart.split("-").map(Number);
  return {
    v: 1,
    weekStart,
    asOf,
    tz: "UTC",
    loggedDays,
    minutes: { byCategory: {}, untagged: 0, unlogged: 0 },
    byActivity: {},
    hours: Array.from({ length: 168 }, () => ({ cat: {}, act: {}, switches: 0 })),
    days: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10),
      elapsed: true,
      unloggedOutsideQuiet: 0,
      recoveryAwake: 180,
      logged: i < loggedDays,
    })),
    nights: [],
    deepBlocks: [],
    shortEntries: {},
  };
}

/** Puts minutes of a Category (and optionally an Activity) into a cell. */
export function put(f: WeekFacts, day: number, hour: number, cat: string, min: number, act?: string) {
  const c = f.hours[day * 24 + hour];
  c.cat[cat] = (c.cat[cat] ?? 0) + min;
  if (act) c.act[act] = (c.act[act] ?? 0) + min;
}

export function ctx(current: WeekFacts, more: Partial<DetectContext> = {}): DetectContext {
  return {
    current,
    pieces: [],
    history: [],
    roles: ROLES,
    activityNames: { G: "Game A", E: "Email", C: "Company A" },
    categoryNames: { deep: "Deep", waste: "Waste" },
    targets: [],
    quietStart: "23:00",
    ...more,
  };
}

/** A piece of owned time in UTC on the week of 2026-11-02 (day 0 = Monday). */
export function piece(day: number, hour: number, min: number, cat: string, acts: string[] = [], entryId = `e${day}-${hour}`) {
  const start = Date.UTC(2026, 10, 2 + day, hour);
  return { start, end: start + min * 60_000, entryId, cat, acts };
}
