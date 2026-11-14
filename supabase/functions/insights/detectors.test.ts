import { assertEquals } from "@std/assert";
import {
  focusLength,
  fragmentedDeep,
  lateHours,
  lateWork,
  maintenanceDrift,
  scatteredShallow,
  sleepShort,
  squeezedRecovery,
  targetGap,
  wasteWindow,
} from "./detectors.ts";
import { blank, ctx, piece, put } from "./testkit.ts";

Deno.test("waste_window: ≥ 3 h Waste with ≥ 50% in one 3-hour window; subject when one Activity has ≥ 50%", () => {
  const f = blank();
  for (const d of [0, 1, 2]) put(f, d, 21, "waste", 60, "G"); // 3 h at 21:00
  put(f, 4, 14, "waste", 60); // 1 h elsewhere -> window 3 of 4 h = 75%
  const pieces = [0, 1, 2].map((d) => piece(d, 21, 60, "waste", ["G"]));
  const c = wasteWindow(ctx(f, { pieces }))!;
  assertEquals(c.subjectKey, "activity:G");
  assertEquals(c.facts, { waste_total: "4h", window_total: "3h", from: "21:00", to: "00:00", share: "75%", activity: "Game A" });
  assertEquals(c.metric, { fn: "category_minutes_in_hours", roles: ["waste"], hours: [21, 22, 23], better: "lower" });
  assertEquals(c.entryIds.length, 3);

  const under = blank();
  for (const d of [0, 1]) put(under, d, 21, "waste", 89); // 178 min < 180
  assertEquals(wasteWindow(ctx(under)), null);

  const spread = blank();
  for (const [d, h] of [[0, 2], [1, 8], [2, 14], [3, 20]]) put(spread, d, h, "waste", 60); // 25% per window
  assertEquals(wasteWindow(ctx(spread)), null);
});

Deno.test("fragmented_deep: ≥ 2 many-switch hours with Deep and ≥ 4 Deep blocks under 20 min", () => {
  const f = blank();
  for (const h of [9, 10]) {
    put(f, 2, h, "deep", 30);
    f.hours[2 * 24 + h].switches = 3;
  }
  f.deepBlocks = [10, 12, 15, 19, 60].map((min) => ({ start: "", min, activityIds: [], next: "other" as const, wasteAfterMin: 0 }));
  const c = fragmentedDeep(ctx(f))!;
  assertEquals(c.facts, { switch_hours: "2", short_blocks: "4", short_deep: "0.9h", busiest: "Wed 09:00", busiest_switches: "3" });
  f.deepBlocks[3].min = 20; // only 3 under 20
  assertEquals(fragmentedDeep(ctx(f)), null);
});

Deno.test("focus_length: ≥ 12 blocks over 4 weeks; best band beats worst by ≥ 30 points", () => {
  const block = (min: number, waste: boolean) => ({
    start: "",
    min,
    activityIds: [],
    next: (waste ? "waste" : "other") as "waste" | "other",
    wasteAfterMin: waste ? 30 : 0,
  });
  const f = blank();
  f.deepBlocks = [
    ...[70, 75, 80, 85].map((m, i) => block(m, i === 0)), // 60-90: 1 of 4 = 25%
    ...[130, 140, 150, 160].map((m, i) => block(m, i < 3)), // 2h+: 3 of 4 = 75%
    ...[40, 45, 50, 55].map((m, i) => block(m, i < 2)), // 30-60: 50%
  ];
  const c = focusLength(ctx(f))!;
  assertEquals([c.facts.best_band, c.facts.worst_band, c.facts.best_minutes], ["60–90 min", "2h or more", "75 min"]);
  assertEquals(c.stakeMin, 90); // 3 × 30 min of Waste, over 1 week of data
  f.deepBlocks.pop(); // 11 blocks
  assertEquals(focusLength(ctx(f)), null);
});

Deno.test("scattered_shallow: ≥ 10 short Entries on ≥ 4 days, ≥ 2 next to Deep", () => {
  const f = blank();
  f.shortEntries = { E: { count: 10, medianMin: 9, days: 4, nearDeep: 2 } };
  const c = scatteredShallow(ctx(f))!;
  assertEquals([c.subjectKey, c.facts.activity, c.facts.median, c.stakeMin], ["activity:E", "Email", "9 min", 90]);
  f.shortEntries.E.days = 3;
  assertEquals(scatteredShallow(ctx(f)), null);
});

Deno.test("target_gap: under for a floor, over for a Waste ceiling, by ≥ max(1 h, 20%)", () => {
  const f = blank();
  f.byActivity = { C: { total: 900, byCategory: { deep: 360, waste: 400 } } };
  const floor = { id: "t1", activity_id: "C", category_id: "deep", minutes: 600 }; // 6h of 10h: 4 h short
  const c = targetGap(ctx(f, { targets: [floor] }))!;
  assertEquals(c.facts, { activity: "Company A", category: "Deep", actual: "6h", target: "10h", gap: "4h", direction: "under" });
  assertEquals(c.metric, { fn: "target_actual", activity_id: "C", category_id: "deep", better: "higher" });
  const ceiling = { id: "t2", activity_id: "C", category_id: "waste", minutes: 300 }; // 400 vs 300: 100 over ≥ 60
  assertEquals(targetGap(ctx(f, { targets: [ceiling] }))!.facts.direction, "over");
  const close = { id: "t3", activity_id: "C", category_id: "deep", minutes: 419 }; // 59 min short
  assertEquals(targetGap(ctx(f, { targets: [close] })), null);
  const overFloor = { id: "t4", activity_id: "C", category_id: null, minutes: 600 }; // over a floor: not flagged
  assertEquals(targetGap(ctx(f, { targets: [overFloor] })), null);
});

Deno.test("sleep_short: ≥ 3 nights under 7 h", () => {
  const f = blank();
  f.nights = [400, 410, 419, 480].map((sleepMin, i) => ({ date: `2026-11-0${2 + i}`, sleepMin }));
  const c = sleepShort(ctx(f))!;
  assertEquals(c.facts, { short_nights: "3", nights: "4", median_sleep: "6.9h", shortfall: "0.5h", under: "7h" });
  f.nights[2].sleepMin = 420;
  assertEquals(sleepShort(ctx(f)), null);
});

Deno.test("late_work: the 2 h before Quiet hours, on ≥ 2 days with ≥ 15 min", () => {
  assertEquals(lateHours("23:00"), [21, 22]);
  assertEquals(lateHours("00:30"), [0, 22, 23]);
  assertEquals(lateHours("22:30"), [20, 21, 22]);
  const f = blank();
  put(f, 1, 21, "deep", 15);
  put(f, 3, 22, "shallow", 40);
  assertEquals(lateWork(ctx(f))!.facts, { days: "2", work: "0.9h", from: "21:00", quiet_start: "23:00" });
  f.hours[1 * 24 + 21].cat.deep = 14;
  assertEquals(lateWork(ctx(f)), null);
});

Deno.test("squeezed_recovery: Recovery other than sleep under 2 h on ≥ 3 logged days", () => {
  const f = blank();
  f.days[0].recoveryAwake = 60;
  f.days[1].recoveryAwake = 90;
  f.days[2].recoveryAwake = 119;
  assertEquals(squeezedRecovery(ctx(f))!.stakeMin, 60 + 30 + 1);
  f.days[2].logged = false; // only logged days count
  assertEquals(squeezedRecovery(ctx(f)), null);
});

Deno.test("maintenance_drift: ≥ 1.5× or ≤ 0.5× my usual (≥ 4 weeks), by ≥ 3 h, over the same span", () => {
  const week = (start: string, min: number, asOf: string) => {
    const f = blank(start, asOf);
    put(f, 0, 10, "maint", min);
    put(f, 6, 20, "maint", 300); // Sunday 20:00: after this week's span end (Sun 18:00)
    return f;
  };
  const history = ["2026-10-26", "2026-10-19", "2026-10-12", "2026-10-05"].map((w) => week(w, 360, "2026-12-31T00:00:00.000Z"));
  const cur = week("2026-11-02", 540, "2026-11-08T18:00:00.000Z");
  cur.hours[6 * 24 + 20].cat = {}; // the current week hasn't reached Sunday 20:00
  const c = maintenanceDrift(ctx(cur, { history }))!;
  assertEquals(c.facts, { now: "9h", usual: "6h", usual_lo: "6h", usual_hi: "6h", direction: "more" });
  assertEquals(c.metric, { fn: "category_minutes", role: "maintenance", better: "toward", target: 660 });
  assertEquals(maintenanceDrift(ctx(cur, { history: history.slice(0, 3) })), null); // 3 usual weeks
});
