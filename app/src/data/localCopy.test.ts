import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Reply = { data: unknown; error: unknown; status: number };
let session: () => { user: { id: string } } | null = () => ({ user: { id: 'u1' } });
const replies: Record<string, Reply> = {};
const calls: { table: string; ops: [string, unknown[]][] }[] = [];

function builder(table: string) {
  const ops: [string, unknown[]][] = [];
  calls.push({ table, ops });
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gt', 'gte', 'lt', 'order', 'abortSignal', 'update']) {
    b[m] = (...args: unknown[]) => {
      ops.push([m, args]);
      return b;
    };
  }
  b.then = (ok: (r: Reply) => unknown, bad: (e: unknown) => unknown) =>
    Promise.resolve(replies[table] ?? { data: [], error: null, status: 200 }).then(ok, bad);
  return b;
}
vi.mock('./supabase', () => ({ supabase: { from: (t: string) => builder(t), auth: { getSession: async () => ({ data: { session: session() } }) } } }));

const { refresh, readLocalCopy, fetchWeek, reportTimeZone, persist } = await import('./localCopy');
const { db } = await import('./db');
const { getTimings, p95, recordTiming, MAX_TIMINGS } = await import('./timings');

const window = { since: '2026-11-02T00:00:00.000Z', sinceDate: '2026-11-02' };
const entry = (id: string) => ({
  id,
  text: id,
  started_at: '2026-11-03T01:00:00Z',
  ended_at: '2026-11-03T02:00:00Z',
  time_zone: 'UTC',
  category_id: null,
  tag_source: null,
  suggested_category_id: null,
  tagging_gave_up_at: null,
  created_at: '2026-11-03T02:00:00Z',
});
const ok = (data: unknown): Reply => ({ data, error: null, status: 200 });

beforeEach(async () => {
  calls.length = 0;
  for (const k of Object.keys(replies)) delete replies[k];
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('refresh', () => {
  it('reads four tables and replaces the copy with refreshed_at', async () => {
    replies.entries = ok([entry('a'), entry('b')]);
    replies.categories = ok([{ id: 'c', name: 'Work', description: 'd', status: 'active' }]);
    replies.settings = ok([{ time_zone: 'UTC', quiet_start: '22:00', quiet_end: '07:00', nudge_gap_hours: 5 }]);
    replies.weekly_reviews = ok([{ week_start: '2026-11-02' }]);
    const r = await refresh(window);
    expect(r.ok).toBe(true);
    expect(calls.map((c) => c.table).sort()).toEqual(['categories', 'entries', 'settings', 'weekly_reviews']);
    const entryOps = calls.find((c) => c.table === 'entries')!.ops;
    expect(entryOps).toContainEqual(['gt', ['ended_at', window.since]]);
    expect(calls.find((c) => c.table === 'weekly_reviews')!.ops).toContainEqual(['gte', ['week_start', '2026-11-02']]);
    const copy = await readLocalCopy();
    expect(copy.entries.map((e) => e.id)).toEqual(['a', 'b']);
    expect(copy.categories).toHaveLength(1);
    expect(copy.settings).toEqual({ time_zone: 'UTC', quiet_start: '22:00', quiet_end: '07:00', nudge_gap_hours: 5 });
    expect(copy.reviews).toEqual([{ week_start: '2026-11-02' }]);
    expect(copy.refreshedAt).toBe(r.ok ? r.data.refreshedAt : '');
  });

  it('replaces, not merges: a deleted Entry disappears', async () => {
    replies.entries = ok([entry('a'), entry('b')]);
    await refresh(window);
    replies.entries = ok([entry('b')]);
    await refresh(window);
    expect((await readLocalCopy()).entries.map((e) => e.id)).toEqual(['b']);
  });

  it('keeps the old copy when any one read fails', async () => {
    replies.entries = ok([entry('a')]);
    await refresh(window);
    const before = await readLocalCopy();
    replies.entries = ok([entry('z')]);
    replies.categories = { data: null, error: { message: 'x' }, status: 503 };
    const r = await refresh(window);
    expect(r).toEqual({ ok: false, error: 'server' });
    expect(await readLocalCopy()).toEqual(before);
  });

  it('keeps the old copy and reports session_lost on 401', async () => {
    replies.entries = ok([entry('a')]);
    await refresh(window);
    replies.settings = { data: null, error: { code: 'PGRST301' }, status: 401 };
    expect(await refresh(window)).toEqual({ ok: false, error: 'session_lost' });
    expect((await readLocalCopy()).entries).toHaveLength(1);
  });

  it('records refresh durations, keeping the last 50', async () => {
    for (let i = 0; i < 52; i++) await refresh(window);
    expect(await getTimings('refresh')).toHaveLength(MAX_TIMINGS);
  });

  it('has no Local copy before the first refresh', async () => {
    expect((await readLocalCopy()).refreshedAt).toBeNull();
  });
});

describe('fetchWeek', () => {
  it('reads one week bounded on both sides and stores nothing', async () => {
    replies.entries = ok([entry('w')]);
    const r = await fetchWeek({ start: '2026-10-26T00:00:00Z', end: '2026-11-02T00:00:00Z' });
    expect(r.ok && r.data.map((e) => e.id)).toEqual(['w']);
    const ops = calls[0].ops;
    expect(ops).toContainEqual(['gt', ['ended_at', '2026-10-26T00:00:00Z']]);
    expect(ops).toContainEqual(['lt', ['started_at', '2026-11-02T00:00:00Z']]);
    expect(await db.entries.count()).toBe(0);
  });
  it('maps a failure', async () => {
    replies.entries = { data: null, error: { message: 'x' }, status: 0 };
    expect(await fetchWeek({ start: 'a', end: 'b' })).toEqual({ ok: false, error: 'unknown' });
  });
});

describe('reportTimeZone and persist', () => {
  it('sends only time_zone, filtered by the user id', async () => {
    await reportTimeZone('Asia/Bangkok');
    expect(calls[0].table).toBe('settings');
    expect(calls[0].ops).toContainEqual(['update', [{ time_zone: 'Asia/Bangkok' }]]);
    expect(calls[0].ops).toContainEqual(['eq', ['user_id', 'u1']]);
  });
  it('without a session it is session_lost and sends nothing', async () => {
    session = () => null;
    expect(await reportTimeZone('UTC')).toEqual({ ok: false, error: 'session_lost' });
    expect(calls).toHaveLength(0);
    session = () => ({ user: { id: 'u1' } });
  });
  it('persist is best effort', async () => {
    expect(typeof (await persist())).toBe('boolean');
    vi.stubGlobal('navigator', { storage: { persist: () => Promise.reject(new Error('no')) } });
    expect(await persist()).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('timings', () => {
  it('computes a nearest-rank p95', () => {
    expect(p95([])).toBeNull();
    expect(p95([5])).toBe(5);
    expect(p95(Array.from({ length: 20 }, (_, i) => i + 1))).toBe(19);
  });
  it('keeps kinds apart and survives a refresh', async () => {
    await recordTiming('save', 120);
    await refresh(window);
    expect(await getTimings('save')).toEqual([120]);
  });
});
