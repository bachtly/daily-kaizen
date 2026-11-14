import { assert, assertEquals } from "@std/assert";
import { computeWeek, rolesOf } from "../_shared/facts.ts";
import { ADHOC_MAX, historyLines, makeWord } from "./ai.ts";
import { evaluate } from "./evaluate.ts";
import { runDue } from "./handler.ts";
import { blank, memoryDb, USER, weekOfEntries } from "./testkit.ts";
import { weekData } from "./weekdata.ts";

const SUNDAY_1830 = Date.parse("2026-11-08T11:30:00Z"); // Ho Chi Minh 18:30
const CATS = { deep: "Deep", shallow: "Shallow", maint: "Maintenance", rec: "Recovery", waste: "Waste" };
const ACTS = { C: "Company A", E: "Email", G: "Game A" };

type Ctx = { candidates: unknown[]; week_data: { timeline: { ref: string; line: string }[]; days: string[] }; library: { id: string }[] };

function fakeApi(reply: (ctx: Ctx) => unknown) {
  const seen: Ctx[] = [];
  const fetchFn = ((_url: string, init: RequestInit) => {
    const ctx = JSON.parse(JSON.parse(String(init.body)).messages[0].content);
    seen.push(ctx);
    const text = JSON.stringify(reply(ctx));
    return Promise.resolve(new Response(JSON.stringify({
      model: "claude-opus-5-5",
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 1 },
      content: [{ type: "text", text }],
    })));
  }) as typeof fetch;
  return { fetchFn, seen };
}

const good = (refs = ["r2"]) => ({
  finding: "Deep work starts at 07:00 every day",
  detail: "Each morning opens with Company A.",
  try_this: "If it's 07:00, then I start with the hardest Company A task.",
  evidence_id: null,
  refs,
});

Deno.test("week data: a timeline per day with refs to its Entries, totals, no Entry text", () => {
  const entries = weekOfEntries("2026-11-02", 2);
  const { facts, pieces } = computeWeek({
    entries,
    weekStart: "2026-11-02",
    tz: USER.time_zone,
    now: SUNDAY_1830,
    roles: rolesOf(Object.entries(CATS).map(([id, name]) => ({ id, name }))),
    quietStart: "23:00",
    quietEnd: "07:00",
  });
  const { data, entriesByRef } = weekData(facts, pieces, CATS, ACTS);
  const line = data.timeline.find((t) => t.line.startsWith("Mon 07:00-12:00"))!;
  assertEquals(line.line, "Mon 07:00-12:00 Deep · Company A (5h)");
  assertEquals(entriesByRef.get(line.ref), ["2026-11-02-2"]);
  assert(data.days[0].startsWith("Mon 2026-11-02 | logged | "), data.days[0]);
  assert(data.days[2].includes("not logged"), data.days[2]);
  assert(data.hours_of_day.some((h) => h.startsWith("21:00 | Waste 2h")), data.hours_of_day.join("\n"));
  assert(data.activities.includes("Company A | 10h | Deep 10h"), data.activities.join(" / "));
  assert(!JSON.stringify(data).includes(entries[0].id), "no Entry ids in the data");
});

Deno.test("ad-hoc: checked findings saved after the cards, max 5, with their Entries; bad ones dropped", async () => {
  const m = memoryDb([...weekOfEntries("2026-10-26"), ...weekOfEntries("2026-11-02")]);
  const api = fakeApi((ctx) => {
    const ref = ctx.week_data.timeline.find((t) => t.line.startsWith("Mon 07:00"))!.ref;
    return {
      cards: [],
      coach_note: "",
      adhoc: [
        { ...good([ref]), evidence_id: "break-timing" },
        { ...good([ref]), finding: "Deep work took 99h" }, // number not in the data
        { ...good(["r999"]) }, // ref that doesn't exist
        { ...good([ref]), evidence_id: "made-up" }, // not in the library
        { ...good([ref]), try_this: "Start earlier." }, // not if-then
        ...Array.from({ length: 6 }, () => good([ref])),
      ],
    };
  });
  await runDue(m.db, SUNDAY_1830, makeWord("key", m.db, api.fetchFn));
  assert(api.seen[0].library.length >= 9, "the whole library is offered");
  const rows = m.saved[0].rows;
  const adhoc = rows.filter((r) => r.kind === "adhoc");
  assertEquals(adhoc.length, ADHOC_MAX);
  assertEquals((adhoc[0].evidence as { id: string }).id, "break-timing");
  assertEquals(adhoc[1].evidence, {});
  assertEquals(adhoc[0].metric, { fn: "none" });
  assertEquals(adhoc[0].text_source, "ai");
  assert(adhoc[0].entry_ids.length >= 1, "See Entries works");
  assertEquals(new Set(adhoc.map((r) => r.subject_key)).size, ADHOC_MAX);
  const firstAdhoc = rows.findIndex((r) => r.kind === "adhoc");
  assert(rows.slice(0, firstAdhoc).every((r) => r.kind !== "adhoc") && firstAdhoc > 0, "after the fixed cards");
  assertEquals(rows.map((r) => r.rank), rows.map((_, i) => i + 1));
});

Deno.test("ad-hoc: the AI runs in a week with no candidates", async () => {
  // no Waste, Recovery 18:00-21:00 and chores after: nothing for the fixed checks
  const swap: Record<string, string> = { maint: "rec", waste: "maint" };
  const m = memoryDb(weekOfEntries("2026-11-02").map((e) => ({ ...e, category_id: swap[e.category_id ?? ""] ?? e.category_id })));
  const api = fakeApi(() => ({ cards: [], coach_note: "", adhoc: [good()] }));
  await runDue(m.db, SUNDAY_1830, makeWord("key", m.db, api.fetchFn));
  assertEquals(api.seen[0].candidates.map((c) => (c as { kind: string }).kind), []);
  assertEquals(m.saved[0].rows.map((r) => r.kind), ["adhoc"]);
});

Deno.test("history: weeks before I started logging are left out", () => {
  const empty = blank("2026-10-19", "2026-10-25T18:00:00.000Z", 0);
  const mine = blank("2026-10-26", "2026-11-01T18:00:00.000Z", 5);
  mine.minutes.byCategory = { deep: 600 };
  const later = blank("2026-11-02", "2026-11-08T18:00:00.000Z", 0);
  const lines = historyLines([later, mine, empty], Object.entries(CATS).map(([id, name]) => ({ id, name })), []);
  assertEquals(lines.map((l) => l.split(" | ")[0]), ["week of 2026-10-26", "week of 2026-11-02"]);
});

Deno.test("an ad-hoc card is never judged as a change", () => {
  const r = evaluate({ week_start: "2026-11-02", active_until: "2026-11-09", metric: { fn: "none" } }, new Map(), {}, "2026-11-09", new Date());
  assertEquals(r, null);
});
