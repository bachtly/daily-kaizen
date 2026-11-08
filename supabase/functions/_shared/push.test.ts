import { assertEquals } from "@std/assert";
import {
  buildPayload,
  loadPushConfig,
  type PushConfig,
  type PushDb,
  type PushSubscriptionRow,
  pushToUser,
  sendPush,
} from "./push.ts";
import { sendEmail } from "./email.ts";

const CFG: PushConfig = {
  vapidPrivateKey: "{}",
  vapidSubject: "mailto:me@example.com",
  appUrl: "https://app.example.com",
};
const sub = (id: string): PushSubscriptionRow => ({
  id,
  endpoint: `https://push.example/${id}`,
  p256dh: "p",
  auth: "a",
});
const MSG = { title: "T", body: "B", path: "/week" };

// deno-lint-ignore no-explicit-any
const fakeBuild: any = (args: any) =>
  Promise.resolve({
    endpoint: args.subscription.endpoint,
    headers: new Headers(),
    body: new ArrayBuffer(0),
    payload: args.message.payload,
  });

Deno.test("buildPayload is the declarative web push shape with an absolute navigate", () => {
  assertEquals(buildPayload(MSG, "https://app.example.com"), {
    web_push: 8030,
    notification: {
      title: "T",
      body: "B",
      navigate: "https://app.example.com/week",
    },
  });
});

Deno.test("loadPushConfig is null when anything is missing", () => {
  const env: Record<string, string> = {
    VAPID_PRIVATE_KEY: "k",
    VAPID_SUBJECT: "mailto:a@b.c",
  };
  assertEquals(loadPushConfig((n) => env[n]), null);
  env.APP_URL = "https://x";
  assertEquals(loadPushConfig((n) => env[n])?.appUrl, "https://x");
});

Deno.test("sendPush maps 201, 404/410 and errors", async () => {
  const cases: [() => Promise<Response>, string][] = [
    [() => Promise.resolve(new Response(null, { status: 201 })), "sent"],
    [() => Promise.resolve(new Response(null, { status: 404 })), "gone"],
    [() => Promise.resolve(new Response(null, { status: 410 })), "gone"],
    [() => Promise.resolve(new Response(null, { status: 500 })), "failed"],
    [() => Promise.reject(new DOMException("t", "TimeoutError")), "failed"],
  ];
  for (const [f, want] of cases) {
    const got = await sendPush(sub("1"), MSG, CFG, {
      fetchFn: f,
      buildRequest: fakeBuild,
    });
    assertEquals(got, want);
  }
});

Deno.test("sendPush sends the payload once, with no retry", async () => {
  let calls = 0;
  await sendPush(sub("1"), MSG, CFG, {
    fetchFn: () => {
      calls++;
      return Promise.resolve(new Response(null, { status: 500 }));
    },
    buildRequest: fakeBuild,
  });
  assertEquals(calls, 1);
});

Deno.test("pushToUser deletes only subscriptions answering 404/410", async () => {
  const deleted: string[] = [];
  const db: PushDb = {
    getSubscriptions: () => Promise.resolve([sub("ok"), sub("dead"), sub("bad")]),
    deleteSubscription: (id) => {
      deleted.push(id);
      return Promise.resolve();
    },
  };
  const status: Record<string, number> = {
    "https://push.example/ok": 201,
    "https://push.example/dead": 410,
    "https://push.example/bad": 500,
  };
  const sent = await pushToUser(db, "u", MSG, CFG, {
    buildRequest: fakeBuild,
    fetchFn: (url) =>
      Promise.resolve(new Response(null, { status: status[String(url)] })),
  });
  assertEquals(sent, 1);
  assertEquals(deleted, ["dead"]);
});

Deno.test("sendEmail posts to Resend and throws on non-2xx", async () => {
  let seen: { url: string; auth: string | null; body: string } | null = null;
  const ok: typeof fetch = (url, init) => {
    seen = {
      url: String(url),
      auth: new Headers(init?.headers).get("authorization"),
      body: String(init?.body),
    };
    return Promise.resolve(new Response("{}", { status: 200 }));
  };
  const cfg = { resendApiKey: "rk", from: "k <n@mail.example.com>" };
  await sendEmail(cfg, { to: "me@example.com", subject: "S", text: "X" }, ok);
  // deno-lint-ignore no-explicit-any
  const s = seen as any;
  assertEquals(s.url, "https://api.resend.com/emails");
  assertEquals(s.auth, "Bearer rk");
  assertEquals(JSON.parse(s.body), {
    from: "k <n@mail.example.com>",
    to: ["me@example.com"],
    subject: "S",
    text: "X",
  });
  let threw = false;
  try {
    await sendEmail(
      cfg,
      { to: "a@b.c", subject: "S", text: "X" },
      () => Promise.resolve(new Response("no", { status: 422 })),
    );
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
