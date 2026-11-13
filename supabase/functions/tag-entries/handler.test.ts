import { assertEquals } from "@std/assert";
import { handle, type HandlerDeps } from "./handler.ts";
import { buildPrompt, parseReply } from "./ai.ts";
import { tagEntry } from "./tagger.ts";
import type { CategoryRow, EntryRow, SaveAiLabelsArgs, TagDb } from "./types.ts";

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
  activity_source: null,
  tagging_gave_up_at: null,
  ...over,
});

function fakeDb(entries: EntryRow[], saveResult = false, activities: string[] = []) {
  const saves: SaveAiLabelsArgs[] = [];
  const failures: string[] = [];
  const db: TagDb = {
    untaggedDue: () => Promise.resolve(entries.map((e) => ({ id: e.id }))),
    getEntry: (id) => Promise.resolve(entries.find((e) => e.id === id) ?? null),
    getCategories: () => Promise.resolve(CATS),
    getActiveActivityNames: () => Promise.resolve(activities),
    saveAiLabels: (a) => {
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
    fetchFn: () => Promise.resolve(aiReply({ category_name: "deep", proposed: null, activity_name: "Company A" })),
  });
  assertEquals((await t.call({ entry_id: ID })).status, 202);
  await t.done();
  assertEquals(saves, [{
    entryId: ID,
    readUpdatedAt: "2026-11-08T10:00:00Z",
    categoryId: "c-deep",
    proposedName: null,
    proposedDescription: null,
    activityName: "Company A",
  }]);
});

Deno.test("proposal is passed on to save_ai_labels", async () => {
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

Deno.test("Entries with both labels set (or mine) and given-up Entries are skipped", async () => {
  for (
    const e of [
      entry({ category_id: "c-deep", tag_source: "ai", activity_source: "ai" }),
      entry({ tag_source: "me", activity_source: "me" }),
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
    activity_name: null,
  });
  assertEquals(parseReply({ category_name: "Deep", proposed: null, activity_name: " Lunch " })?.activity_name, "Lunch");
  for (const bad of [undefined, null, "", "  ", 5]) {
    assertEquals(parseReply({ category_name: "Deep", proposed: null, activity_name: bad })?.activity_name, null);
  }
  assertEquals(parseReply({ category_name: "", proposed: null }), null);
  assertEquals(parseReply({ category_name: "Deep", proposed: { name: "x" } }), null);
  assertEquals(parseReply("x"), null);
});

Deno.test("suggestion hook fires only when save_ai_labels inserted a new category", async () => {
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

Deno.test("a failing suggestion hook does not fail tagging", async () => {
  const { db, saves } = fakeDb([entry()], true);
  const res = await tagEntry(ID, {
    db,
    anthropicApiKey: "ak",
    fetchFn: () =>
      Promise.resolve(aiReply({
        category_name: "Deep",
        proposed: { name: "Social", description: "people" },
      })),
    onNewSuggestion: () => Promise.reject(new Error("push down")),
  });
  assertEquals(res, "tagged");
  assertEquals(saves.length, 1);
});

const AI_ACT = (input: unknown) => () => Promise.resolve(aiReply(input));

Deno.test("prompt lists the Active Activities, or says there are none", () => {
  const p = buildPrompt("x", CATS.slice(0, 2), [], ["Company A", "Lunch"]);
  assertEquals(p.includes("- Company A\n- Lunch"), true);
  assertEquals(buildPrompt("x", CATS.slice(0, 2), []).includes("no Activities yet"), true);
});

Deno.test("the prompt sent to the AI carries the user's Active Activity names", async () => {
  const { db } = fakeDb([entry()], false, ["Company A"]);
  let sent = "";
  await tagEntry(ID, {
    db,
    anthropicApiKey: "ak",
    fetchFn: (_u, init) => {
      sent = String(init?.body);
      return Promise.resolve(aiReply({ category_name: "Deep", proposed: null, activity_name: null }));
    },
  });
  assertEquals(sent.includes("Company A"), true);
});

Deno.test("both labels missing: both are saved in one call", async () => {
  const { db, saves } = fakeDb([entry()]);
  const res = await tagEntry(ID, {
    db,
    anthropicApiKey: "ak",
    fetchFn: AI_ACT({ category_name: "Deep", proposed: null, activity_name: "Company A" }),
  });
  assertEquals(res, "tagged");
  assertEquals(saves[0].categoryId, "c-deep");
  assertEquals(saves[0].activityName, "Company A");
});

Deno.test("activity-only: Category already set, so categoryId is null and no proposal is sent", async () => {
  const { db, saves } = fakeDb([entry({ category_id: "c-waste", tag_source: "ai" })]);
  const res = await tagEntry(ID, {
    db,
    anthropicApiKey: "ak",
    fetchFn: AI_ACT({
      category_name: "Deep",
      proposed: { name: "Social", description: "people" },
      activity_name: "Game A",
    }),
  });
  assertEquals(res, "tagged");
  assertEquals(saves, [{
    entryId: ID,
    readUpdatedAt: "2026-11-08T10:00:00Z",
    categoryId: null,
    proposedName: null,
    proposedDescription: null,
    activityName: "Game A",
  }]);
});

Deno.test("activity-only: an unusable category_name is not a failure when the Category is set", async () => {
  const { db, saves, failures } = fakeDb([entry({ category_id: "c-deep", tag_source: "me" })]);
  await tagEntry(ID, {
    db,
    anthropicApiKey: "ak",
    fetchFn: AI_ACT({ category_name: "Rejected one", proposed: null, activity_name: "Lunch" }),
  });
  assertEquals(failures.length, 0);
  assertEquals(saves[0].activityName, "Lunch");
});

Deno.test("Category missing, Activity already set: only the Category is asked for and saved", async () => {
  const { db, saves } = fakeDb([entry({ activity_source: "me" })]);
  await tagEntry(ID, {
    db,
    anthropicApiKey: "ak",
    fetchFn: AI_ACT({ category_name: "Waste", proposed: null, activity_name: "Ignored" }),
  });
  assertEquals(saves[0].categoryId, "c-waste");
});

Deno.test("null activity_name is saved as no Activity", async () => {
  const { db, saves } = fakeDb([entry()]);
  await tagEntry(ID, {
    db,
    anthropicApiKey: "ak",
    fetchFn: AI_ACT({ category_name: "Deep", proposed: null, activity_name: null }),
  });
  assertEquals(saves[0].activityName, null);
});

Deno.test("an Activity-only Entry still counts a failed attempt when the AI call fails", async () => {
  const { db, saves, failures } = fakeDb([entry({ category_id: "c-deep", tag_source: "ai" })]);
  const res = await tagEntry(ID, {
    db,
    anthropicApiKey: "ak",
    fetchFn: () => Promise.resolve(new Response("err", { status: 529 })),
  });
  assertEquals(res, "failed");
  assertEquals(saves.length, 0);
  assertEquals(failures.length, 1);
});
