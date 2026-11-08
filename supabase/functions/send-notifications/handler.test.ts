import { assertEquals } from "@std/assert";
import { handle, type HandlerDeps } from "./handler.ts";
import { localTime } from "./notify.ts";
import type { ClaimedNotification, NotifyDb } from "./types.ts";

const ENV: Record<string, string> = {
  SUPABASE_URL: "http://db",
  SUPABASE_SERVICE_ROLE_KEY: "svc",
  JOB_SECRET: "sekret",
  VAPID_PRIVATE_KEY: "{}",
  VAPID_SUBJECT: "mailto:me@example.com",
  APP_URL: "https://app.example.com",
  RESEND_API_KEY: "rk",
  RESEND_FROM: "k <n@mail.example.com>",
};

// deno-lint-ignore no-explicit-any
const fakeBuild: any = (args: any) =>
  Promise.resolve({
    endpoint: args.subscription.endpoint,
    headers: new Headers(),
    body: new ArrayBuffer(0),
    payload: args.message.payload,
  });

interface Sent {
  url: string;
  body?: string;
}

function setup(rows: ClaimedNotification[], opts: {
  env?: Record<string, string>;
  email?: string | null;
  pushStatus?: number;
  emailStatus?: number;
} = {}) {
  const sent: Sent[] = [];
  const deleted: string[] = [];
  let claims = 0;
  const db: NotifyDb = {
    claim: () => {
      claims++;
      return Promise.resolve(rows);
    },
    getTimeZone: () => Promise.resolve("Asia/Ho_Chi_Minh"),
    getUserEmail: () =>
      Promise.resolve(opts.email === undefined ? "me@example.com" : opts.email),
    getSubscriptions: () =>
      Promise.resolve([{ id: "s1", endpoint: "https://push.example/1", p256dh: "p", auth: "a" }]),
    deleteSubscription: (id) => {
      deleted.push(id);
      return Promise.resolve();
    },
  };
  const pending: Promise<unknown>[] = [];
  const fetchFn: typeof fetch = (url, init) => {
    const u = String(url);
    sent.push({ url: u, body: typeof init?.body === "string" ? init.body : undefined });
    const status = u.includes("resend.com")
      ? opts.emailStatus ?? 200
      : opts.pushStatus ?? 201;
    return Promise.resolve(new Response(null, { status }));
  };
  const deps: HandlerDeps = {
    getEnv: (n) => (opts.env ?? ENV)[n],
    makeDb: () => db,
    waitUntil: (p) => pending.push(p),
    fetchFn,
    pushDeps: { buildRequest: fakeBuild },
  };
  const call = (secret: string | null = "sekret") =>
    handle(
      new Request("http://fn", {
        method: "POST",
        headers: secret ? { "x-job-secret": secret } : {},
        body: "{}",
      }),
      deps,
    );
  return { call, done: () => Promise.all(pending), sent, deleted, claims: () => claims };
}

const NUDGE: ClaimedNotification = {
  user_id: "u1",
  kind: "nudge",
  about: "2026-11-08T07:10:00Z",
};
const REVIEW: ClaimedNotification = {
  user_id: "u1",
  kind: "review_reminder",
  about: "2026-11-02",
};

Deno.test("bad secret is 401 and claims nothing", async () => {
  const t = setup([NUDGE]);
  assertEquals((await t.call("nope")).status, 401);
  assertEquals((await t.call(null)).status, 401);
  await t.done();
  assertEquals(t.claims(), 0);
});

Deno.test("missing config is 503 and claims nothing", async () => {
  const t = setup([NUDGE], { env: { ...ENV, RESEND_API_KEY: "" } });
  assertEquals((await t.call()).status, 503);
  await t.done();
  assertEquals(t.claims(), 0);
});

Deno.test("202; a claimed Nudge sends one push and no email", async () => {
  const t = setup([NUDGE]);
  assertEquals((await t.call()).status, 202);
  await t.done();
  assertEquals(t.claims(), 1);
  assertEquals(t.sent.map((s) => s.url), ["https://push.example/1"]);
});

Deno.test("a claimed Review reminder sends push and email to the login email", async () => {
  const t = setup([REVIEW]);
  await t.call();
  await t.done();
  assertEquals(t.sent.map((s) => s.url), [
    "https://push.example/1",
    "https://api.resend.com/emails",
  ]);
  const mail = JSON.parse(t.sent[1].body!);
  assertEquals(mail.to, ["me@example.com"]);
  assertEquals(mail.subject, "Your weekly review is ready");
  assertEquals(
    mail.text,
    "See where your time went this week. Open daily-kaizen from your Home Screen and go to This week.",
  );
});

Deno.test("no claimed rows sends nothing", async () => {
  const t = setup([]);
  await t.call();
  await t.done();
  assertEquals(t.sent.length, 0);
});

Deno.test("404/410 deletes the subscription", async () => {
  for (const pushStatus of [404, 410]) {
    const t = setup([NUDGE], { pushStatus });
    await t.call();
    await t.done();
    assertEquals(t.deleted, ["s1"]);
  }
});

Deno.test("other push errors keep the subscription; one failure doesn't block the next row", async () => {
  const t = setup([NUDGE, REVIEW], { pushStatus: 500, emailStatus: 500 });
  await t.call();
  await t.done();
  assertEquals(t.deleted, []);
  // nudge push, review push, review email: all attempted once, none retried.
  assertEquals(t.sent.length, 3);
});

Deno.test("a Review reminder still emails when the push fails", async () => {
  const t = setup([REVIEW], { pushStatus: 500 });
  await t.call();
  await t.done();
  assertEquals(t.sent.some((s) => s.url.includes("resend.com")), true);
});

Deno.test("localTime formats in the user's zone", () => {
  assertEquals(localTime("2026-11-08T07:10:00Z", "Asia/Ho_Chi_Minh"), "14:10");
  assertEquals(localTime("2026-11-08T07:10:00Z", null), null);
  assertEquals(localTime("garbage", "Asia/Ho_Chi_Minh"), null);
  assertEquals(localTime("2026-11-08T07:10:00Z", "Not/AZone"), null);
});
