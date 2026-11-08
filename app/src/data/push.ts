import type { Result } from './request';
import type { PushSubscriptionInput } from './writes';

export type PushState = 'off' | 'on' | 'denied' | 'not-installed';

/** The browser pieces push needs, so tests can stand in for them. */
export type PushEnv = {
  /** Opened from the Home Screen icon (iOS only offers push there). */
  standalone: boolean;
  /** `Notification.permission`; null when the browser has no Notification API. */
  permission: NotificationPermission | null;
  requestPermission: () => Promise<NotificationPermission>;
  /** The service worker's push manager; null when there is none (not installed, or unsupported). */
  pushManager: () => Promise<PushManager | null>;
};

export type PushOutcome = { state: PushState; error?: 'unknown' | 'session_lost' | 'server' };

/** VAPID public key (base64url) → the bytes `subscribe` wants. */
export function vapidKeyBytes(key: string): Uint8Array<ArrayBuffer> {
  const b64 = key.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(key.length / 4) * 4, '=');
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function browserEnv(): PushEnv {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    standalone: window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true,
    permission: typeof Notification === 'undefined' ? null : Notification.permission,
    requestPermission: () => Notification.requestPermission(),
    pushManager: async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
      return (await navigator.serviceWorker.ready).pushManager;
    },
  };
}

export function toSubscriptionInput(sub: PushSubscription): PushSubscriptionInput | null {
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys.auth) return null;
  return { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth };
}

type Report = (sub: PushSubscriptionInput) => Promise<Result<unknown>>;

async function subscribeAndReport(env: PushEnv, vapidKey: string, report: Report): Promise<PushOutcome> {
  const pm = await env.pushManager();
  if (!pm) return { state: 'not-installed' };
  const sub = (await pm.getSubscription()) ?? (await pm.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(vapidKey) }));
  const input = toSubscriptionInput(sub);
  if (!input) return { state: 'off', error: 'server' };
  const r = await report(input);
  if (r.ok) return { state: 'on' };
  const error = r.error === 'unknown' || r.error === 'session_lost' ? r.error : 'server';
  return { state: 'on', error };
}

/**
 * What the Settings page shows on open. Permission already granted: send the subscription again (AC-6.2),
 * so a replaced endpoint reaches the Server. Never asks for permission (iOS wants a tap).
 */
export async function openPush(env: PushEnv, vapidKey: string | undefined, report: Report): Promise<PushOutcome> {
  if (!env.standalone || env.permission === null) return { state: 'not-installed' };
  if (env.permission === 'denied') return { state: 'denied' };
  if (env.permission !== 'granted' || !vapidKey) return { state: 'off' };
  try {
    // Permission is granted, so push is on even if the Server could not be told yet (the next open resends).
    return await subscribeAndReport(env, vapidKey, report);
  } catch {
    return { state: 'off', error: 'server' };
  }
}

/** The "Turn on notifications" tap: permission → subscribe(VAPID) → upsert (AC-6.2). */
export async function turnOnPush(env: PushEnv, vapidKey: string | undefined, report: Report): Promise<PushOutcome> {
  if (!env.standalone || env.permission === null) return { state: 'not-installed' };
  if (!vapidKey) return { state: 'off', error: 'server' };
  try {
    const permission = await env.requestPermission();
    if (permission === 'denied') return { state: 'denied' };
    if (permission !== 'granted') return { state: 'off' };
    return await subscribeAndReport(env, vapidKey, report);
  } catch {
    return { state: 'off', error: 'server' };
  }
}
