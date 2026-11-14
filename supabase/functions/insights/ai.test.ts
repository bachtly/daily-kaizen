import { assert, assertEquals } from "@std/assert";
import { makeWord, noteState, SCHEMA } from "./ai.ts";
import { dueAction, handle, runDue } from "./handler.ts";
import { memoryDb, weekOfEntries } from "./testkit.ts";
import { allowedFrom, numbersIn, numbersOk } from "./validate.ts";

const SUNDAY_1830 = Date.parse("2026-11-08T11:30:00Z"); // Ho Chi Minh 18:30
const ENTRIES = [...weekOfEntries("2026-10-26"), ...weekOfEntries("2026-11-02")];

type Ctx = {
  history: string[];
  my_lines: string[];
  dismissed: { reason: string | null }[];
  candidates: {
    candidate_id: number;
    kind: string;
    facts: Record<string, string>;
    template: { finding: string; detail: string; try_this: string };
    allowed_evidence: { id: string }[];
  }[];
};

/** A fake Messages API: records each request and answers with `reply(context)`. */
function fakeApi(reply: (ctx: Ctx) => unknown, status = 200) {
  const requests: Record<string, unknown>[] = [];
  const fetchFn = ((_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    requests.push(body);
    return Promise.resolve(new Response(JSON.stringify(reply(JSON.parse(body.messages[0].content))), { status }));
  }) as typeof fetch;
  return { fetchFn, requests };
}
const message = (json: unknown, stop = "end_turn") => ({
  model: "claude-opus-5-5",
  stop_reason: stop,
  usage: { input_tokens: 5000, output_tokens: 900 },
  content: [{ type: "thinking", thinking: "" }, { type: "text", text: JSON.stringify(json) }],
});

Deno.test("numbers: tokens, clock and unit variants", () => {
  assertEquals(numbersIn("6.5h of 9h after 21:00, 1,200 min"), ["6.5", "9", "21:00", "1200"]);
  const ok = allowedFrom(["6h", "21:00", "75 min"]);
  assert(numbersOk("6 hours, 360 minutes, after 9pm or 21:00 or 9:00", ok));
  assert(numbersOk("about 1.3h", ok), "75 min as hours");
  assert(!numbersOk("7h", ok));
});

Deno.test("my lines: the newest version I wrote, none after I cleared it", () => {
  assertEquals(
    noteState([{ body: "AI", source: "ai" }, { body: "I work nights.\nNo games", source: "me" }]).myLines,
    ["I work nights.", "No games"],
  );
  assertEquals(noteState([{ body: "", source: "me" }, { body: "old", source: "me" }]).myLines, []);
});

Deno.test("AI wording: good cards are used, a bad number falls back to the template, the note is saved", async () => {
  const m = memoryDb(ENTRIES, { notes: [{ body: "I work nights.", source: "me" }] });
  const api = fakeApi((ctx) => {
    assert(ctx.history.length >= 2, "history lines");
    assertEquals(ctx.my_lines, ["I work nights."]);
    assertEquals(ctx.dismissed[0].reason, "I work nights");
    const cards = ctx.candidates.map((c) =>
      c.kind === "waste_window"
        ? {
          candidate_id: c.candidate_id,
          finding: `Waste after ${c.facts.from} took ${c.facts.window_total}`,
          detail: `Most of it was ${c.facts.activity}.`,
          try_this: `If it's ${c.facts.from}, then I charge my phone in the kitchen.`,
          evidence_id: c.allowed_evidence[0].id,
          may_not_apply: null,
        }
        : {
          candidate_id: c.candidate_id,
          finding: "This took 99h", // not in facts
          detail: "x",
          try_this: "If x, then y.",
          evidence_id: c.allowed_evidence[0].id,
          may_not_apply: null,
        }
    );
    return message({ cards, coach_note: "I work nights.\nEvenings are when Waste happens." });
  });
  await runDue(m.db, SUNDAY_1830, makeWord("key", m.db, api.fetchFn));
  const req = api.requests[0];
  assertEquals([req.model, (req.output_config as { effort: string }).effort, req.fallbacks], ["claude-opus-5-5", "medium", "default"]);
  assertEquals((req.output_config as { format: { schema: unknown } }).format.schema, SCHEMA);
  const rows = m.saved[0].rows;
  const waste = rows.find((r) => r.kind === "waste_window")!;
  assertEquals([waste.text_source, waste.finding], ["ai", "Waste after 21:00 took 12h"]);
  assert(rows.filter((r) => r.kind !== "waste_window").every((r) => r.text_source === "template"));
  assertEquals(m.notes[0], { body: "I work nights.\nEvenings are when Waste happens.", source: "ai" });
  assertEquals(m.runs[0].status, "ok");
});

Deno.test("a note that drops my line is not saved; missing cards use templates", async () => {
  const m = memoryDb(ENTRIES, { notes: [{ body: "I work nights.", source: "me" }] });
  const api = fakeApi(() => message({ cards: [], coach_note: "Evenings are hard." }));
  await runDue(m.db, SUNDAY_1830, makeWord("key", m.db, api.fetchFn));
  assertEquals(m.notes.length, 1);
  assert(m.saved[0].rows.every((r) => r.text_source === "template"));
});

Deno.test("a note with a number not in the history is not saved", async () => {
  const m = memoryDb(ENTRIES);
  const api = fakeApi(() => message({ cards: [], coach_note: "Waste is 37h a week." }));
  await runDue(m.db, SUNDAY_1830, makeWord("key", m.db, api.fetchFn));
  assertEquals(m.notes.length, 0);
});

Deno.test("may_not_apply sorts the card last", async () => {
  const m = memoryDb(ENTRIES);
  const api = fakeApi((ctx) => {
    const first = ctx.candidates[0];
    return message({
      cards: [{ ...first.template, candidate_id: 1, evidence_id: first.allowed_evidence[0].id, may_not_apply: "You said you work nights." }],
      coach_note: "",
    });
  });
  await runDue(m.db, SUNDAY_1830, makeWord("key", m.db, api.fetchFn));
  const rows = m.saved[0].rows;
  assert(rows.length >= 2);
  assertEquals(rows[rows.length - 1].may_not_apply, "You said you work nights.");
  assertEquals(rows.map((r) => r.rank), rows.map((_, i) => i + 1));
});

Deno.test("a refusal: template cards saved, run ai_failed, retried that evening up to 3 times", async () => {
  const m = memoryDb(ENTRIES);
  const api = fakeApi(() => message({}, "refusal"));
  const word = makeWord("key", m.db, api.fetchFn);
  await runDue(m.db, SUNDAY_1830, word);
  assertEquals(m.runs.map((r) => r.status), ["ai_failed"]);
  assert(m.saved[0].rows.length > 0 && m.saved[0].rows.every((r) => r.text_source === "template"));
  for (const h of [1, 2, 3, 4]) await runDue(m.db, SUNDAY_1830 + h * 3_600_000, word);
  assertEquals(m.runs.length, 3, "the first run and 2 retries, then it stops");
  assertEquals(
    dueAction({ user_id: "u", time_zone: "UTC", quiet_start: "23:00", quiet_end: "07:00" }, Date.parse("2026-11-08T20:00:00Z")),
    "retry",
  );
});

Deno.test("phone: signed in, this or last week, once an hour", async () => {
  const env: Record<string, string> = { SUPABASE_URL: "http://db", SUPABASE_SERVICE_ROLE_KEY: "svc", JOB_SECRET: "s" };
  const call = async (m: ReturnType<typeof memoryDb>, init: { auth?: string; body?: unknown }) => {
    const headers: Record<string, string> = {};
    if (init.auth) headers.authorization = `Bearer ${init.auth}`;
    const res = await handle(
      new Request("http://x", { method: "POST", headers, body: init.body ? JSON.stringify(init.body) : undefined }),
      { getEnv: (n) => env[n], makeDb: () => m.db, waitUntil: () => {}, now: () => SUNDAY_1830 },
    );
    return [res.status, await res.json()];
  };
  assertEquals((await call(memoryDb(ENTRIES), {}))[0], 401);
  assertEquals((await call(memoryDb(ENTRIES), { auth: "bad" }))[0], 401);
  assertEquals(await call(memoryDb(ENTRIES), { auth: "good", body: { week_start: "2026-10-19" } }), [400, { error: "week_not_allowed" }]);
  const soon = await call(memoryDb(ENTRIES, { lastMyRun: new Date(SUNDAY_1830 - 30 * 60_000).toISOString() }), { auth: "good" });
  assertEquals(soon[0], 429);
  const m = memoryDb(ENTRIES);
  const [status, body] = await call(m, { auth: "good", body: { week_start: "2026-10-26" } });
  assertEquals([status, body.status], [200, "ok"]);
  assertEquals([m.runs[0].week, m.runs[0].trigger], ["2026-10-26", "me"]);
  const opt = await handle(new Request("http://x", { method: "OPTIONS" }), { getEnv: (n) => env[n], makeDb: () => m.db, waitUntil: () => {} });
  assertEquals([opt.status, opt.headers.get("access-control-allow-origin")], [204, "*"]);
});
