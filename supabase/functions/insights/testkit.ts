// Test helpers: hand-built week facts and contexts (not shipped logic).
import type { FactsEntry, WeekFacts } from "../_shared/facts.ts";
import type { InsightRow, InsightsDb, RunningChange, RunStatus, UserSettings } from "./db.ts";
import type { ChangeResult } from "./evaluate.ts";
import type { DetectContext, PastInsight } from "./types.ts";

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

export const USER: UserSettings = { user_id: "u1", time_zone: "Asia/Ho_Chi_Minh", quiet_start: "23:00:00", quiet_end: "07:00:00" };
const CATS = [
  { id: "deep", name: "Deep" },
  { id: "shallow", name: "Shallow" },
  { id: "maint", name: "Maintenance" },
  { id: "rec", name: "Recovery" },
  { id: "waste", name: "Waste" },
];

/** A fully logged week in Ho Chi Minh time (UTC+7): sleep, work, and Waste every evening 21:00-23:00. */
export function weekOfEntries(monday: string, days = 7): FactsEntry[] {
  const out: FactsEntry[] = [];
  const [y, m, d] = monday.split("-").map(Number);
  const at = (day: number, h: number) => new Date(Date.UTC(y, m - 1, d + day, h - 7)).toISOString();
  let n = 0;
  const add = (day: number, s: number, e: number, cat: string, acts: string[] = []) =>
    out.push({ id: `${monday}-${++n}`, started_at: at(day, s), ended_at: at(day, e), created_at: at(day, e), category_id: cat, activity_ids: acts });
  for (let day = 0; day < days; day++) {
    add(day, -1, 7, "rec"); // 23:00 the evening before -> 07:00
    add(day, 7, 12, "deep", ["C"]);
    add(day, 12, 18, "shallow", ["E"]);
    add(day, 18, 21, "maint");
    add(day, 21, 23, "waste", ["G"]);
  }
  return out;
}

export function memoryDb(
  entries: FactsEntry[],
  opts: { past?: PastInsight[]; running?: RunningChange[]; notes?: { body: string; source: "ai" | "me" }[]; lastMyRun?: string } = {},
) {
  const summaries = new Map<string, WeekFacts>();
  const saved: { week: string; rows: InsightRow[] }[] = [];
  const results: { id: string; result: ChangeResult }[] = [];
  const runs: { id: string; week: string; trigger: string; status: string }[] = [];
  const notes = [...(opts.notes ?? [])];
  const db: InsightsDb = {
    listUsers: () => Promise.resolve([USER]),
    getCategories: () => Promise.resolve(CATS),
    getActivities: () =>
      Promise.resolve([
        { id: "C", name: "Company A", status: "active", merged_into_id: null },
        { id: "E", name: "Email", status: "active", merged_into_id: null },
        { id: "G", name: "Game A", status: "active", merged_into_id: null },
      ]),
    getTargets: () => Promise.resolve([]),
    getEntries: (_u, from, to) =>
      Promise.resolve(entries.filter((e) => e.started_at < to && e.ended_at > from)),
    upsertSummary: (_u, f) => (summaries.set(f.weekStart, f), Promise.resolve()),
    getSummaries: (_u, since) =>
      Promise.resolve([...summaries.values()].filter((f) => f.weekStart >= since).sort((a, b) => b.weekStart.localeCompare(a.weekStart))),
    getPastInsights: () => Promise.resolve(opts.past ?? []),
    saveInsights: (_u, week, rows) => (saved.push({ week, rows }), Promise.resolve(rows.length)),
    getRunningChanges: () => Promise.resolve(opts.running ?? []),
    saveResult: (_u, id, result) => (results.push({ id, result }), Promise.resolve()),
    startRun: (_u, week, trigger) => {
      const id = `r${runs.length + 1}`;
      runs.push({ id, week, trigger, status: "running" });
      return Promise.resolve(id);
    },
    finishRun: (_u, id, patch) => {
      runs.find((r) => r.id === id)!.status = patch.status;
      return Promise.resolve();
    },
    hasRun: (_u, week, trigger, statuses) =>
      Promise.resolve(runs.some((r) => r.week === week && r.trigger === trigger && statuses.includes(r.status as never))),
    runStatuses: (_u, week, trigger) =>
      Promise.resolve(runs.filter((r) => r.week === week && r.trigger === trigger).map((r) => r.status as RunStatus)),
    lastMyRunAt: () => Promise.resolve(opts.lastMyRun ?? null),
    getChanges: () => Promise.resolve([]),
    getDismissed: () => Promise.resolve([{ kind: "late_work", subject: "", week_start: "2026-10-26", reason: "I work nights" }]),
    getCoachNotes: () => Promise.resolve([...notes]),
    addCoachNote: (_u, _w, body) => (notes.unshift({ body, source: "ai" }), Promise.resolve()),
    userFromJwt: (jwt) => Promise.resolve(jwt === "good" ? USER.user_id : null),
    getUser: () => Promise.resolve(USER),
  };
  return { db, summaries, saved, results, runs, notes };
}

