import { afterEach, describe, expect, it, vi } from 'vitest';
import { request } from './request';

afterEach(() => vi.useRealTimers());

describe('request', () => {
  it('returns data on success', async () => {
    const r = await request(async () => ({ data: [1], error: null, status: 200 }));
    expect(r).toEqual({ ok: true, data: [1] });
  });
  it('maps a PostgREST error', async () => {
    const r = await request(async () => ({
      data: null,
      error: { code: '23514', message: 'violates check constraint "entry_text_empty"' },
      status: 400,
    }));
    expect(r).toEqual({ ok: false, error: 'entry_text_empty' });
  });
  it('maps session lost and server', async () => {
    expect(
      await request(async () => ({ data: null, error: { code: 'PGRST301' }, status: 401 })),
    ).toEqual({ ok: false, error: 'session_lost' });
    expect(
      await request(async () => ({ data: null, error: { message: 'x' }, status: 500 })),
    ).toEqual({ ok: false, error: 'server' });
  });
  it('maps a thrown fetch error to unknown', async () => {
    const r = await request(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(r).toEqual({ ok: false, error: 'unknown' });
  });
  it('times out after 10 s as unknown and aborts the signal', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const p = request((s) => {
      signal = s;
      return new Promise<never>(() => {});
    });
    await vi.advanceTimersByTimeAsync(9_999);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(await p).toEqual({ ok: false, error: 'unknown' });
    expect(signal?.aborted).toBe(true);
  });
});
