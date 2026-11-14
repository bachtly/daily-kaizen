import { assertEquals } from "@std/assert";
import { computeWeek, type FactsEntry, quietFraction, rolesOf, spanCells, topCategory } from "./facts.ts";

const roles = rolesOf([
  { id: "deep", name: "Deep" },
  { id: "shallow", name: "Shallow" },
  { id: "maint", name: "Maintenance" },
  { id: "rec", name: " recovery " },
  { id: "waste", name: "Waste" },
]);

let n = 0;
const e = (s: string, en: string, cat: string | null, acts: string[] = []): FactsEntry => ({
  id: `e${++n}`,
  started_at: `2026-11-${s}:00Z`,
  ended_at: `2026-11-${en}:00Z`,
  created_at: `2026-11-${en}:00Z`,
  category_id: cat,
  activity_ids: acts,
});
const week = (entries: FactsEntry[], now = "2026-11-09T00:00:00Z") =>
  computeWeek({
    entries,
    weekStart: "2026-11-02",
    tz: "UTC",
    now: Date.parse(now),
    roles,
    quietStart: "23:00",
    quietEnd: "07:00",
  });

Deno.test("roles match Category names ignoring case and spaces", () => {
  assertEquals(roles, { deep: "deep", shallow: "shallow", maintenance: "maint", recovery: "rec", waste: "waste" });
});

Deno.test("quiet fraction wraps midnight", () => {
  assertEquals(quietFraction(23, "23:00", "07:00"), 1);
  assertEquals(quietFraction(6, "23:00", "07:00"), 1);
  assertEquals(quietFraction(7, "23:00", "07:00"), 0);
  assertEquals(quietFraction(22, "22:30", "07:00"), 0.5);
});

Deno.test("hour cells, switches, blocks, sleep and short Entries", () => {
  const { facts, pieces } = week([
    e("02T23:00", "03T07:00", "rec"), // sleep, night of Mon
    e("03T09:00", "03T10:00", "deep", ["A"]),
    e("03T10:05", "03T10:45", "waste", ["G"]), // follows Deep within 15 min
    e("03T11:00", "03T11:10", "shallow", ["E"]), // short, next to Deep
    e("03T11:12", "03T12:00", "deep", ["A", "B"]),
  ]);
  assertEquals(pieces.length, 5);
  // Tue 09:00 cell is Deep, Activity A
  assertEquals(facts.hours[24 + 9].cat, { deep: 60 });
  assertEquals(facts.hours[24 + 9].act, { A: 60 });
  // the 11:12-12:00 Entry's 48 min split equally between A and B
  assertEquals(facts.hours[24 + 11].act, { E: 10, A: 24, B: 24 });
  assertEquals(facts.byActivity.B, { total: 24, byCategory: { deep: 24 } });
  // switches: Deep→Waste at 10:05 (gap 5) and Shallow→Deep at 11:12; 10:45→11:00 is a gap
  assertEquals(facts.hours[24 + 10].switches, 1);
  assertEquals(facts.hours[24 + 11].switches, 1);
  assertEquals(facts.hours[24 + 9].switches, 0);
  // Deep blocks
  assertEquals(facts.deepBlocks.map((b) => [b.min, b.next, b.wasteAfterMin, b.activityIds]), [
    [60, "waste", 40, ["A"]],
    [48, "none", 0, ["A", "B"]],
  ]);
  // sleep night of Monday, 8 h; not counted as awake Recovery
  assertEquals(facts.nights, [{ date: "2026-11-02", sleepMin: 480 }]);
  assertEquals(facts.days[1].recoveryAwake, 0);
  assertEquals(facts.shortEntries.E, { count: 1, medianMin: 10, days: 1, nearDeep: 1 });
  assertEquals(facts.minutes.byCategory, { rec: 480, deep: 108, waste: 40, shallow: 10 });
  assertEquals(topCategory(facts.hours[24 + 11]), "deep");
});

Deno.test("a logged day: ≤ 180 min Unlogged outside Quiet hours; unlogged sleep doesn't count", () => {
  const { facts } = week([
    e("04T07:00", "04T12:00", "deep"),
    e("04T12:00", "04T20:00", "shallow"), // Wed 07:00-20:00 covered, 20:00-23:00 open = 180 min
    e("05T07:00", "05T12:00", "deep"),
    e("05T12:00", "05T19:59", "shallow"), // Thu: 181 min open outside Quiet hours
  ]);
  assertEquals(facts.days[2].unloggedOutsideQuiet, 180);
  assertEquals(facts.days[2].logged, true);
  assertEquals(facts.days[3].unloggedOutsideQuiet, 181);
  assertEquals(facts.days[3].logged, false);
  assertEquals(facts.loggedDays, 1);
});

Deno.test("only past time counts; today is not a logged day; the span ends now", () => {
  const { facts } = week([e("04T07:00", "04T23:00", "deep")], "2026-11-04T23:30:00Z");
  assertEquals(facts.days[2].elapsed, false);
  assertEquals(facts.days[2].logged, false);
  assertEquals(facts.asOf, "2026-11-04T23:30:00.000Z");
  assertEquals(spanCells(facts), 2 * 24 + 23);
  assertEquals(spanCells({ ...facts, asOf: "2026-11-09T00:00:00.000Z" }), 168);
});
