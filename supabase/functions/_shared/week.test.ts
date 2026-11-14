import { assertEquals } from "@std/assert";
import { mondayOf, ownedSegments, weekBounds, weekTotals } from "./week.ts";

// The full rules are tested in app/src/data/week.test.ts; this proves the module runs in Deno.
Deno.test("week rules run in Deno, with a 25 h day", () => {
  const tz = "Europe/Berlin";
  // Week of 2026-10-19: the 25th has 25 hours (DST ends).
  const b = weekBounds("2026-10-19", tz);
  assertEquals((b.end - b.start) / 3_600_000, 169);
  assertEquals(mondayOf(Date.parse("2026-10-25T22:30:00Z"), tz), "2026-10-19");
  const e = (id: string, s: string, en: string, created: string, cat: string | null) =>
    ({ id, started_at: s, ended_at: en, created_at: created, category_id: cat });
  const entries = [
    e("a", "2026-10-20T08:00:00Z", "2026-10-20T10:00:00Z", "2026-10-20T10:00:00Z", "deep"),
    e("b", "2026-10-20T09:00:00Z", "2026-10-20T09:30:00Z", "2026-10-20T11:00:00Z", null),
  ];
  const segs = ownedSegments(entries, b.start, b.end);
  assertEquals(segs.map((s) => [s.entry.id, s.ms / 60_000]), [["a", 60], ["b", 30], ["a", 30]]);
  const t = weekTotals(entries, b, Date.parse("2026-10-20T12:00:00Z"));
  assertEquals(t.byCategory.deep / 60_000, 90);
  assertEquals(t.untaggedMs / 60_000, 30);
});
