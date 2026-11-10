import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithOtp = vi.fn();
const verifyOtp = vi.fn();
const signOutApi = vi.fn();
vi.mock('./supabase', () => ({ supabase: { auth: { signInWithOtp, verifyOtp, signOut: signOutApi } } }));

const { sendCode, verifyCode, signOut } = await import('./auth');
const { db } = await import('./db');

beforeEach(() => {
  signInWithOtp.mockReset();
  verifyOtp.mockReset();
  signOutApi.mockReset();
});

describe('sendCode', () => {
  it('never creates a user', async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    expect(await sendCode('a@b.c')).toEqual({ ok: true });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.c',
      options: { shouldCreateUser: true },
    });
  });
  it('gives the same result for an unknown email (4xx)', async () => {
    signInWithOtp.mockResolvedValue({ error: { status: 400, name: 'AuthApiError' } });
    expect(await sendCode('x@y.z')).toEqual({ ok: true });
  });
  it('maps network and server failures', async () => {
    signInWithOtp.mockResolvedValue({ error: { status: 0, name: 'AuthRetryableFetchError' } });
    expect(await sendCode('a@b.c')).toEqual({ ok: false, error: 'unknown' });
    signInWithOtp.mockResolvedValue({ error: { status: 500, name: 'AuthApiError' } });
    expect(await sendCode('a@b.c')).toEqual({ ok: false, error: 'server' });
    signInWithOtp.mockRejectedValue(new Error('x'));
    expect(await sendCode('a@b.c')).toEqual({ ok: false, error: 'unknown' });
  });
});

describe('verifyCode', () => {
  it('verifies an email code', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    expect(await verifyCode('a@b.c', '123456')).toEqual({ ok: true });
    expect(verifyOtp).toHaveBeenCalledWith({ email: 'a@b.c', token: '123456', type: 'email' });
  });
  it('maps a wrong code, network and server', async () => {
    verifyOtp.mockResolvedValue({ error: { status: 403, name: 'AuthApiError' } });
    expect(await verifyCode('a@b.c', '000000')).toEqual({ ok: false, error: 'invalid_code' });
    verifyOtp.mockResolvedValue({ error: { status: 0, name: 'AuthRetryableFetchError' } });
    expect(await verifyCode('a@b.c', '1')).toEqual({ ok: false, error: 'unknown' });
    verifyOtp.mockResolvedValue({ error: { status: 502, name: 'AuthApiError' } });
    expect(await verifyCode('a@b.c', '1')).toEqual({ ok: false, error: 'server' });
  });
});

describe('signOut', () => {
  const fill = async () => {
    await db.entries.put({ id: 'e1', text: 't', started_at: 'a', ended_at: 'b', time_zone: 'UTC', category_id: null, tag_source: null, suggested_category_id: null, tagging_gave_up_at: null, created_at: 'a' } as never);
    await db.meta.put({ key: 'refreshed_at', value: 'x' });
  };
  it('signs this device out only and clears the Local copy', async () => {
    await fill();
    signOutApi.mockResolvedValue({ error: null });
    expect(await signOut()).toEqual({ ok: true });
    expect(signOutApi).toHaveBeenCalledWith({ scope: 'local' });
    expect(await db.entries.count()).toBe(0);
    expect(await db.meta.count()).toBe(0);
  });
  it('keeps the Local copy when the Server fails or is unreachable', async () => {
    await fill();
    signOutApi.mockResolvedValue({ error: { status: 0, name: 'AuthRetryableFetchError' } });
    expect(await signOut()).toEqual({ ok: false, error: 'unknown' });
    signOutApi.mockResolvedValue({ error: { status: 500, name: 'AuthApiError' } });
    expect(await signOut()).toEqual({ ok: false, error: 'server' });
    signOutApi.mockRejectedValue(new Error('x'));
    expect(await signOut()).toEqual({ ok: false, error: 'unknown' });
    expect(await db.entries.count()).toBe(1);
  });
});
