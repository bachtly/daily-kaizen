import { assert, assertEquals } from "@std/assert";
import { evidenceById } from "../_shared/evidence.ts";
import { DETECTORS, EVIDENCE_FOR } from "./detectors.ts";
import { evaluate } from "./evaluate.ts";
import { excluded, freshness, rank, weight } from "./rank.ts";
import { LIMITS, templateText } from "./templates.ts";
import { blank, put, ROLES } from "./testkit.ts";
import type { Candidate, Kind, PastInsight } from "./types.ts";
import { KINDS } from "./types.ts";

const W = "2026-11-09";
const cand = (kind: Kind, stakeMin: number, subjectKey = ""): Candidate => ({
  kind,
  subjectKey,
  stakeMin,
  facts: {},
  entryIds: [],
  metric: { fn: "short_nights", under: 420, better: "lower" },
  evidenceIds: EVIDENCE_FOR[kind],
});
const past = (week: string, kind: string, status: PastInsight["status"], extra: Partial<PastInsight> = {}): PastInsight => ({
  week_start: week,
  kind,
  subject_key: "",
  status,
  active_until: null,
  verdict: null,
  ...extra,
});

Deno.test("weight starts at 1 and moves slowly with accepts, helps, dismissals and worse", () => {
  assertEquals(weight("sleep_short", [], W), 1);
  assertEquals(weight("sleep_short", [past("2026-10-26", "sleep_short", "accepted", { verdict: "helped" })], W), 2 * 4 / 6);
  assertEquals(weight("sleep_short", [past("2026-10-26", "sleep_short", "dismissed")], W), 2 * 2 / 5);
  assertEquals(weight("sleep_short", [past("2026-04-27", "sleep_short", "dismissed")], W), 1, "older than 26 weeks");
});

Deno.test("a dismissal hides that kind and subject for 8 weeks", () => {
  const p = [past("2026-09-14", "late_work", "dismissed")]; // 8 weeks before W
  assertEquals(excluded(cand("late_work", 60), p, W), "dismissed");
  assertEquals(excluded(cand("late_work", 60), p, "2026-11-16"), null);
  assertEquals(excluded(cand("late_work", 60, "activity:X"), p, W), null, "another subject");
});

Deno.test("a running change is not a candidate", () => {
  const p = [past("2026-11-02", "waste_window", "accepted", { active_until: W })];
  assertEquals(excluded(cand("waste_window", 60), p, W), "running");
  assertEquals(excluded(cand("waste_window", 60), p, "2026-11-16"), null);
});

Deno.test("ignored twice halves; ignored 3 weeks in a row pauses for 4 weeks", () => {
  const two = [past("2026-11-02", "sleep_short", "new"), past("2026-10-26", "sleep_short", "new")];
  assertEquals(freshness(cand("sleep_short", 60), two, W), 0.5);
  const three = [...two, past("2026-10-19", "sleep_short", "new")];
  assertEquals(excluded(cand("sleep_short", 60), three, W), "paused");
  assertEquals(excluded(cand("sleep_short", 60), three, "2026-11-30"), "paused");
  assertEquals(excluded(cand("sleep_short", 60), three, "2026-12-07"), null);
});

Deno.test("rank orders by score, keeps 8, numbers the ranks", () => {
  const cs = KINDS.map((k, i) => cand(k, 10 + i));
  const r = rank(cs, [past("2026-11-02", "maintenance_drift", "dismissed")], W);
  assertEquals(r.length, 8);
  assertEquals(r[0].kind, "squeezed_recovery");
  assertEquals(r.map((c) => c.rank), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert(!r.some((c) => c.kind === "maintenance_drift"));
});

Deno.test("every kind has evidence in the library and templates within limits, using only facts", () => {
  assertEquals(DETECTORS.length, KINDS.length);
  const facts: Record<string, string> = {
    waste_total: "9h", window_total: "6h", from: "21:00", to: "00:00", share: "67%", activity: "A very long activity name that goes on",
    switch_hours: "2", short_blocks: "4", short_deep: "1h", busiest: "Wed 09:00", busiest_switches: "5",
    weeks: "4", best_band: "60–90 min", best_blocks: "7", best_waste: "1", best_minutes: "75 min", worst_band: "2h or more",
    worst_blocks: "4", worst_waste: "3", count: "14", median: "9 min", days: "5", near_deep: "3",
    category: "Deep", actual: "6h", target: "10h", gap: "4h", direction: "under", short_nights: "3", nights: "6",
    median_sleep: "6.5h", shortfall: "2h", under: "7h", work: "2h", quiet_start: "23:00", days_under: "3",
    logged_days: "6", median_recovery: "1.5h", now: "9h", usual: "6h", usual_lo: "5h", usual_hi: "7h",
  };
  for (const k of KINDS) {
    for (const id of EVIDENCE_FOR[k]) assert(evidenceById(id), `${k}: ${id}`);
    const t = templateText({ ...cand(k, 1), facts });
    assert(t.finding.length <= LIMITS.finding, `${k} finding: ${t.finding}`);
    assert(t.detail.length <= LIMITS.detail, `${k} detail: ${t.detail}`);
    assert(t.try_this.length <= LIMITS.try_this, `${k} try: ${t.try_this}`);
    assert(t.try_this.startsWith("If "), `${k} if-then`);
    assert(!/undefined/.test(t.finding + t.detail + t.try_this), `${k} uses a missing fact`);
  }
});

Deno.test("change result: helped only when the change weeks beat every usual week", () => {
  const week = (start: string, wasteMin: number, logged = 7) => {
    const f = blank(start, "2026-12-31T00:00:00.000Z", logged);
    put(f, 0, 21, "waste", wasteMin);
    return f;
  };
  const metric = { fn: "category_minutes_in_hours" as const, roles: ["waste" as const], hours: [21, 22, 23], better: "lower" as const };
  const weeks = new Map([
    ["2026-10-12", week("2026-10-12", 300)],
    ["2026-10-19", week("2026-10-19", 420)],
    ["2026-10-26", week("2026-10-26", 30, 3)], // not a usual week: 3 logged days
    ["2026-11-02", week("2026-11-02", 360)], // the insight's own week
    ["2026-11-09", week("2026-11-09", 120)], // the change week
  ]);
  const ins = { week_start: "2026-11-02", active_until: W, metric };
  const now = new Date("2026-11-16T04:00:00Z");
  const r = evaluate(ins, weeks, ROLES, W, now)!;
  assertEquals([r.baseline, r.after, r.verdict, r.final, r.unit], [[360, 420, 300], [120], "helped", true, "min"]);
  weeks.set(W, week(W, 330));
  assertEquals(evaluate(ins, weeks, ROLES, W, now)!.verdict, "unclear");
  weeks.set(W, week(W, 430));
  assertEquals(evaluate(ins, weeks, ROLES, W, now)!.verdict, "worse");
  weeks.delete("2026-10-12");
  assertEquals(evaluate(ins, weeks, ROLES, W, now)!.verdict, "too_few_weeks");
  assertEquals(evaluate(ins, weeks, ROLES, "2026-11-02", now), null, "no week of the run has ended");
});
