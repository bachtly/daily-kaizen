import { buildPushHTTPRequest } from "@pushforge/builder";

export const PUSH_TIMEOUT_MS = 10_000;

export interface PushConfig {
  /** VAPID private key as a JWK JSON string. */
  vapidPrivateKey: string;
  /** `mailto:` address or URL (VAPID subject). */
  vapidSubject: string;
  /** Origin of the app, e.g. https://kaizen.example.pages.dev; declarative push needs absolute URLs. */
  appUrl: string;
}

/** Push is best-effort: returns null when any of the three values is missing. */
export function loadPushConfig(
  get: (name: string) => string | undefined,
): PushConfig | null {
  const vapidPrivateKey = get("VAPID_PRIVATE_KEY");
  const vapidSubject = get("VAPID_SUBJECT");
  const appUrl = get("APP_URL");
  if (!vapidPrivateKey || !vapidSubject || !appUrl) return null;
  return { vapidPrivateKey, vapidSubject, appUrl };
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** App path such as "/" or "/week". */
  path: string;
}

/** Declarative Web Push payload (iOS 18.4+): `{web_push: 8030, notification: {title, body, navigate}}`. */
export function buildPayload(msg: PushMessage, appUrl: string) {
  return {
    web_push: 8030,
    notification: {
      title: msg.title,
      body: msg.body,
      navigate: new URL(msg.path, appUrl).toString(),
    },
  };
}

export interface PushDeps {
  fetchFn?: typeof fetch;
  buildRequest?: typeof buildPushHTTPRequest;
}

/** sent | gone (404/410: delete the subscription) | failed. No retry. */
export type PushResult = "sent" | "gone" | "failed";

export async function sendPush(
  sub: PushSubscriptionRow,
  msg: PushMessage,
  cfg: PushConfig,
  deps: PushDeps = {},
): Promise<PushResult> {
  const build = deps.buildRequest ?? buildPushHTTPRequest;
  const doFetch = deps.fetchFn ?? fetch;
  try {
    const { endpoint, headers, body } = await build({
      privateJWK: JSON.parse(cfg.vapidPrivateKey),
      subscription: {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      message: {
        payload: buildPayload(msg, cfg.appUrl),
        adminContact: cfg.vapidSubject,
      },
    });
    const res = await doFetch(endpoint, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
    });
    await res.body?.cancel();
    if (res.status === 404 || res.status === 410) return "gone";
    return res.status >= 200 && res.status < 300 ? "sent" : "failed";
  } catch (e) {
    console.error(`push failed: ${(e as Error).message}`);
    return "failed";
  }
}

export interface PushDb {
  getSubscriptions(userId: string): Promise<PushSubscriptionRow[]>;
  deleteSubscription(id: string): Promise<void>;
}

/** Sends to every subscription of the user and deletes those the push service says are gone. Returns the number sent. */
export async function pushToUser(
  db: PushDb,
  userId: string,
  msg: PushMessage,
  cfg: PushConfig,
  deps: PushDeps = {},
): Promise<number> {
  let sent = 0;
  for (const sub of await db.getSubscriptions(userId)) {
    const r = await sendPush(sub, msg, cfg, deps);
    if (r === "sent") sent++;
    if (r === "gone") await db.deleteSubscription(sub.id);
  }
  return sent;
}
