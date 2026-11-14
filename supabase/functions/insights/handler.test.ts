import { assert, assertEquals } from "@std/assert";
import { dbFromClient } from "./db.ts";
import type { ChangeResult } from "./evaluate.ts";
import { dueAction, handle, runDue } from "./handler.ts";
import { memoryDb, USER, weekOfEntries } from "./testkit.ts";

// Sunday 2026-11-08 18:30 in Ho Chi Minh = 11:30 UTC
const SUNDAY_1830 = Date.parse("2026-11-08T11:30:00Z");
const MONDAY_0430 = Date.parse("2026-11-15T21:30:00Z"); // Monday 2026-11-16 04:30 local

Deno.test("due: Sunday 18:00-18:59 local generates, Monday 04:00-04:59 finalises", () => {
  assertEquals(dueAction(USER, SUNDAY_1830), "generate");
  assertEquals(dueAction(USER, SUNDAY_1830 - 31 * 60_000), null); // 17:59
  assertEquals(dueAction(USER, MONDAY_0430), "finalise");
  assertEquals(dueAction(USER, MONDAY_0430 + 60 * 60_000), null);
});

Deno.test("Sunday: summaries, ranked template cards with evidence, once a week", async () => {
  const m = memoryDb([...weekOfEntries("2026-10-26"), ...weekOfEntries("2026-11-02")]);
  await runDue(m.db, SUNDAY_1830);
  assertEquals(m.runs.map((r) => [r.week, r.status]), [["2026-11-02", "ok"]]);
  assert(m.summaries.has("2026-11-02") && m.summaries.has("2026-10-26"), "this week and the missing earlier ones");
  const rows = m.saved[0].rows;
  const waste = rows.find((r) => r.kind === "waste_window")!;
  assertEquals(waste.subject_key, "activity:G");
  assertEquals(waste.facts.from, "21:00");
  assertEquals(waste.text_source, "template");
  assertEquals((waste.evidence as { id: string }).id, "if-then-plans");
  assert(waste.entry_ids.length >= 6);
  assertEquals(rows.map((r) => r.rank), rows.map((_, i) => i + 1));
  await runDue(m.db, SUNDAY_1830 + 10 * 60_000);
  assertEquals(m.runs.length, 1, "not again the same week");
});

Deno.test("fewer than 5 logged days: too early, no cards", async () => {
  const m = memoryDb(weekOfEntries("2026-11-02", 3));
  await runDue(m.db, SUNDAY_1830);
  assertEquals(m.runs.map((r) => r.status), ["too_early"]);
  assertEquals(m.saved.length, 0);
});

Deno.test("Monday: recompute 9 weeks and judge the running change", async () => {
  const entries = ["2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09"].flatMap((w) => weekOfEntries(w));
  // the change week has no Waste
  const m = memoryDb(entries.filter((e) => !(e.started_at >= "2026-11-09" && e.category_id === "waste")), {
    running: [{
      id: "i1",
      week_start: "2026-11-02",
      active_until: "2026-11-09",
      metric: { fn: "category_minutes_in_hours", roles: ["waste"], hours: [21, 22, 23], better: "lower" },
    }],
  });
  await runDue(m.db, MONDAY_0430);
  assertEquals(m.summaries.size, 9);
  assertEquals(m.results.map((r) => [r.id, r.result.verdict, r.result.after, r.result.final]), [["i1", "helped", [0], true]]);
  assertEquals(m.results[0].result.baseline, [840, 840, 840, 840]);
});

Deno.test("handler: POST only, 503 without config, 401 without the job secret, 202 with it", async () => {
  const env: Record<string, string> = { SUPABASE_URL: "http://db", SUPABASE_SERVICE_ROLE_KEY: "svc", JOB_SECRET: "s" };
  const work: Promise<unknown>[] = [];
  const deps = (e: Record<string, string>) => ({
    getEnv: (n: string) => e[n],
    makeDb: () => memoryDb([]).db,
    waitUntil: (p: Promise<unknown>) => void work.push(p),
    now: () => SUNDAY_1830,
  });
  assertEquals((await handle(new Request("http://x", { method: "GET" }), deps(env))).status, 405);
  assertEquals((await handle(new Request("http://x", { method: "POST" }), deps({}))).status, 503);
  assertEquals((await handle(new Request("http://x", { method: "POST" }), deps(env))).status, 401);
  const ok = new Request("http://x", { method: "POST", headers: { "x-job-secret": "s" } });
  assertEquals((await handle(ok, deps(env))).status, 202);
  await Promise.all(work);
});

Deno.test("db: every update is filtered by user_id and id", async () => {
  const calls: string[] = [];
  // deno-lint-ignore no-explicit-any
  const chain: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === "then") return (r: (v: unknown) => void) => r({ data: { id: "r1" }, error: null });
      return (...args: unknown[]) => {
        calls.push(`${prop}(${args.map((a) => JSON.stringify(a)).join(",")})`);
        return chain;
      };
    },
  });
  const db = dbFromClient(chain);
  await db.saveResult("u1", "i1", { verdict: "helped" } as ChangeResult);
  await db.finishRun("u1", "r1", { status: "ok" });
  const updates = calls.join(" ").split("update(").slice(1);
  assertEquals(updates.length, 2);
  for (const u of updates) {
    assert(u.includes(`eq("user_id","u1")`), u);
    assert(/eq\("id","(i1|r1)"\)/.test(u), u);
  }
});
