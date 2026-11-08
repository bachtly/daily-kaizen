import { describe, expect, it, vi } from 'vitest';
import { openPush, turnOnPush, vapidKeyBytes, type PushEnv } from './push';

const KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const sub = { toJSON: () => ({ endpoint: 'https://push/1', keys: { p256dh: 'p', auth: 'a' } }) } as unknown as PushSubscription;

function env(over: Partial<PushEnv> = {}, existing: PushSubscription | null = null) {
  const subscribe = vi.fn(async () => sub);
  const pm = { getSubscription: vi.fn(async () => existing), subscribe } as unknown as PushManager;
  const e: PushEnv = {
    standalone: true, permission: 'default', requestPermission: vi.fn(async () => 'granted' as const),
    pushManager: async () => pm, ...over,
  };
  return { e, subscribe };
}
const ok = vi.fn(async () => ({ ok: true as const, data: undefined }));

describe('vapidKeyBytes', () => {
  it('decodes a base64url key to 65 bytes', () => {
    const b = vapidKeyBytes(KEY);
    expect(b.length).toBe(65);
    expect(b[0]).toBe(4);
  });
});

describe('openPush', () => {
  it('says not-installed outside the Home Screen app, without asking', async () => {
    const { e } = env({ standalone: false });
    expect(await openPush(e, KEY, ok)).toEqual({ state: 'not-installed' });
    expect(e.requestPermission).not.toHaveBeenCalled();
  });
  it('says denied', async () => {
    expect(await openPush(env({ permission: 'denied' }).e, KEY, ok)).toEqual({ state: 'denied' });
  });
  it('stays off and does not ask when permission was never given', async () => {
    const { e, subscribe } = env();
    expect(await openPush(e, KEY, ok)).toEqual({ state: 'off' });
    expect(e.requestPermission).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });
  it('sends the existing subscription again when granted', async () => {
    const report = vi.fn(ok);
    const { e, subscribe } = env({ permission: 'granted' }, sub);
    expect(await openPush(e, KEY, report)).toEqual({ state: 'on' });
    expect(report).toHaveBeenCalledWith({ endpoint: 'https://push/1', p256dh: 'p', auth: 'a' });
    expect(subscribe).not.toHaveBeenCalled();
  });
  it('subscribes when granted but no subscription exists', async () => {
    const { e, subscribe } = env({ permission: 'granted' });
    expect((await openPush(e, KEY, ok)).state).toBe('on');
    expect(subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) });
  });
  it('stays on and reports the failure when the Server could not be told', async () => {
    const report = vi.fn(async () => ({ ok: false as const, error: 'unknown' as const }));
    expect(await openPush(env({ permission: 'granted' }, sub).e, KEY, report)).toEqual({ state: 'on', error: 'unknown' });
  });
});

describe('turnOnPush', () => {
  it('asks, subscribes with the VAPID key and reports', async () => {
    const report = vi.fn(ok);
    const { e, subscribe } = env();
    expect(await turnOnPush(e, KEY, report)).toEqual({ state: 'on' });
    expect(e.requestPermission).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledOnce();
  });
  it('stays off with the error when the subscription could not be sent, so the button stays', async () => {
    const report = vi.fn(async () => ({ ok: false as const, error: 'unknown' as const }));
    expect(await turnOnPush(env().e, KEY, report)).toEqual({ state: 'off', error: 'unknown' });
  });
  it('shows denied and sends nothing when refused', async () => {
    const report = vi.fn(ok);
    const { e, subscribe } = env({ requestPermission: async () => 'denied' });
    expect(await turnOnPush(e, KEY, report)).toEqual({ state: 'denied' });
    expect(subscribe).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });
  it('stays off when the prompt is dismissed', async () => {
    expect(await turnOnPush(env({ requestPermission: async () => 'default' }).e, KEY, ok)).toEqual({ state: 'off' });
  });
  it('turns a subscribe failure into an error', async () => {
    const { e } = env({ pushManager: async () => { throw new Error('x'); } });
    expect(await turnOnPush(e, KEY, ok)).toEqual({ state: 'off', error: 'server' });
  });
  it('is off with an error when the VAPID key is missing', async () => {
    expect(await turnOnPush(env().e, undefined, ok)).toEqual({ state: 'off', error: 'server' });
  });
});
