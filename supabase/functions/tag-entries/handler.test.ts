import { assertEquals } from "@std/assert";
import { handle, type HandlerDeps } from "./handler.ts";
import { parseReply } from "./ai.ts";
import { tagEntry } from "./tagger.ts";
import type { CategoryRow, EntryRow, SaveAiTagArgs, TagDb } from "./types.ts";

const ID = "11111111-1111-4111-8111-111111111111";
const ENV: Record<string, string> = {
  SUPABASE_URL: "http://db",
  SUPABASE_SERVICE_ROLE_KEY: "svc",
  JOB_SECRET: "sekret",
  ANTHROPIC_API_KEY: "ak",
};

const CATS: CategoryRow[] = [
  { id: "c-deep", name: "Deep", description: "focus", status: "active" },
  { id: "c-waste", name: "Waste", description: "aimless", status: "active" },
  { id: "c-old", name: "Rejected one", description: "x", status: "rejected" },
];

const entry = (over: Partial<EntryRow> = {}): EntryRow => ({
  id: ID,
  user_id: "u1",
  text: "SECRET ENTRY TEXT",
  updated_at: "2026-11-08T10:00:00Z",
  category_id: null,
  tag_source: null,
  tagging_gave_up_at: null,
  ...over,
});

function fakeDb(entries: EntryRow[], saveResult = false) {
  const saves: SaveAiTagArgs[] = [];
  const failures: string[] = [];
  const db: TagDb = {
    untaggedDue: () => Promise.resolve(entries.map((e) => ({ id: e.id }))),
    getEntry: (id) => Promise.resolve(entries.find((e) => e.id === id) ?? null),
    getCategories: () => Promise.resolve(CATS),
    saveAiTag: (a) => {
      saves.push(a);
      return Promise.resolve(saveResult);
    },
    recordTagFailure: (id, at) => {
      failures.push(`${id}@${at}`);
      return Promise.resolve();
    },
  };
  return { db, saves, failures };
}

const aiReply = (input: unknown) =>
  new Response(
    JSON.stringify({ content: [{ type: "tool_use", input }] }),
    { status: 200 },
  );

function setup(opts: {
  db: TagDb;
  fetchFn?: typeof fetch;
  env?: Record<string, string>;
  now?: () => number;
}) {
  const pending: Promise<unknown>[] = [];
  const deps: HandlerDeps = {
    getEnv: (n) => (opts.env ?? ENV)[n],
    makeDb: () => opts.db,
    waitUntil: (p) => pending.push(p),
    fetchFn: opts.fetchFn,
    now: opts.now,
  };
  const call = (body: unknown, secret: string | null = "sekret") =>
    handle(
      new Request("http://fn", {
        method: "POST",
        headers: secret ? { "x-job-secret": secret } : {},
        body: JSON.stringify(body),
      }),
      deps,
    );
  return { call, done: () => Promise.all(pending) };
}

Deno.test("wrong or missing secret gets 401 and no work", async () => {
  const { db, saves } = fakeDb([entry()]);
  const t = setup({ db, fetchFn: () => Promise.reject(new Error("no")) });
  assertEquals((await t.call({}, "nope")).status, 401);
  assertEquals((await t.call({}, null)).status, 401);
  await t.done();
  assertEquals(saves.length, 0);
});

Deno.test("missing config gets 503 and counts no attempt", async () => {
  const { db, saves } = fakeDb([entry()]);
  const env = { ...ENV, ANTHROPIC_API_KEY: "" };
  const t = setup({ db, env });
  assertEquals((await t.call({ entry_id: ID })).status, 503);
  await t.done();
  assertEquals(saves.length, 0);
});

Deno.test("bad entry_id gets 400", async () => {
  const t = setup({ db: fakeDb([]).db });
  assertEquals((await t.call({ entry_id: "nope" })).status, 400);
});

Deno.test("202 at once, tags with the matching Active category", async () => {
  const { db, saves } = fakeDb([entry()]);
  const t = setup({
    db,
    fetchFn: () => Promise.resolve(aiReply({ category_name: "deep", proposed: null })),
  });
  assertEquals((await t.call({ entry_id: ID })).status, 202);
  await t.done();
  assertEquals(saves, [{
    entryId: ID,
    readUpdatedAt: "2026-11-08T10:00:00Z",
    categoryId: "c-deep",
    proposedName: null,
    proposedDescription: null,
  }]);
});

Deno.test("proposal is passed on to save_ai_tag", async () => {
  const { db, saves } = fakeDb([entry()], true);
  const t = setup({
    db,
    fetchFn: () =>
      Promise.resolve(aiReply({
        category_name: "Waste",
        proposed: { name: "Social", description: "time with people" },
      })),
  });
  await t.call({ entry_id: ID });
  await t.done();
  assertEquals(saves[0].proposedName, "Social");
  assertEquals(saves[0].proposedDescription, "time with people");
});

Deno.test("a name that is not Active counts as a failed attempt", async () => {
  const { db, saves, failures } = fakeDb([entry()]);
  const t = setup({
    db,
    fetchFn: () =>
      Promise.resolve(aiReply({ category_name: "Rejected one", proposed: null })),
  });
  await t.call({ entry_id: ID });
  await t.done();
  assertEquals(saves.length, 0);
  assertEquals(failures, [`${ID}@2026-11-08T10:00:00Z`]);
});

Deno.test("malformed reply, 5xx and timeout each count one failed attempt", async () => {
  const cases: (() => Promise<Response>)[] = [
    () => Promise.resolve(aiReply({ nope: 1 })),
    () => Promise.resolve(new Response("err", { status: 529 })),
    () => Promise.reject(new DOMException("timeout", "TimeoutError")),
  ];
  for (const f of cases) {
    const { db, saves, failures } = fakeDb([entry()]);
    const t = setup({ db, fetchFn: f });
    await t.call({ entry_id: ID });
    await t.done();
    assertEquals(saves.length, 0);
    assertEquals(failures.length, 1);
  }
});

Deno.test("Entries tagged by me, already tagged or given up are skipped", async () => {
  for (
    const e of [
      entry({ tag_source: "me" }),
      entry({ category_id: "c-deep", tag_source: "ai" }),
      entry({ tagging_gave_up_at: "2026-11-08T11:00:00Z" }),
    ]
  ) {
    const { db, saves } = fakeDb([e]);
    const t = setup({ db, fetchFn: () => Promise.reject(new Error("no")) });
    await t.call({ entry_id: ID });
    await t.done();
    assertEquals(saves.length, 0);
  }
});

Deno.test("{} uses untagged_due and stops starting Entries after 110 s", async () => {
  const ids = [1, 2, 3].map((n) => `${n}1111111-1111-4111-8111-111111111111`);
  const { db, saves } = fakeDb(ids.map((id) => entry({ id })));
  let clock = 0;
  const t = setup({
    db,
    now: () => clock,
    fetchFn: () => {
      clock += 60_000; // each AI call "takes" 60 s
      return Promise.resolve(aiReply({ category_name: "Deep", proposed: null }));
    },
  });
  assertEquals((await t.call({})).status, 202);
  await t.done();
  // Entry 1 at 0 s, entry 2 at 60 s, entry 3 would start at 120 s: skipped.
  assertEquals(saves.map((s) => s.entryId), ids.slice(0, 2));
});

Deno.test("Entry text is never logged", async () => {
  const { db } = fakeDb([entry()]);
  const logs: string[] = [];
  const orig = console.error;
  console.error = (...a: unknown[]) => logs.push(a.join(" "));
  try {
    const t = setup({
      db,
      fetchFn: () => Promise.resolve(new Response("err", { status: 500 })),
    });
    await t.call({ entry_id: ID });
    await t.done();
  } finally {
    console.error = orig;
  }
  assertEquals(logs.length > 0, true);
  assertEquals(logs.some((l) => l.includes("SECRET ENTRY TEXT")), false);
});

Deno.test("parseReply validates shape", () => {
  assertEquals(parseReply({ category_name: " Deep ", proposed: null }), {
    category_name: "Deep",
    proposed: null,
  });
  assertEquals(parseReply({ category_name: "", proposed: null }), null);
  assertEquals(parseReply({ category_name: "Deep", proposed: { name: "x" } }), null);
  assertEquals(parseReply("x"), null);
});

Deno.test("suggestion hook fires only when save_ai_tag inserted a new category", async () => {
  const reply = () =>
    Promise.resolve(aiReply({
      category_name: "Deep",
      proposed: { name: "Social", description: "people" },
    }));
  for (const inserted of [true, false]) {
    const { db } = fakeDb([entry()], inserted);
    const hits: string[] = [];
    await tagEntry(ID, {
      db,
      anthropicApiKey: "ak",
      fetchFn: reply,
      onNewSuggestion: (i) => {
        hits.push(i.name);
      },
    });
    assertEquals(hits, inserted ? ["Social"] : []);
  }
});
