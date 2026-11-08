import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithOtp = vi.fn();
const verifyOtp = vi.fn();
vi.mock('./supabase', () => ({ supabase: { auth: { signInWithOtp, verifyOtp } } }));

const { sendCode, verifyCode } = await import('./auth');

beforeEach(() => {
  signInWithOtp.mockReset();
  verifyOtp.mockReset();
});

describe('sendCode', () => {
  it('never creates a user', async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    expect(await sendCode('a@b.c')).toEqual({ ok: true });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.c',
      options: { shouldCreateUser: false },
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
