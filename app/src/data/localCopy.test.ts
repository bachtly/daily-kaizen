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
vi.mock('./supabase', () => ({ supabase: { from: (t: string) => builder(t), rpc: (n: string) => builder(n), auth: { getSession: async () => ({ data: { session: session() } }) } } }));

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
  activity_source: null,
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
  it('reads six sources and replaces the copy with refreshed_at', async () => {
    replies.entries = ok([
      { ...entry('a'), entry_activities: [{ activity_id: 'z', created_at: '2026-11-03T02:00:02Z' }, { activity_id: 'y', created_at: '2026-11-03T02:00:01Z' }] },
      { ...entry('b'), entry_activities: [] },
    ]);
    replies.categories = ok([{ id: 'c', name: 'Work', description: 'd', status: 'active' }]);
    replies.activities = ok([{ id: 'a1', name: 'Email', status: 'active', merged_into_id: null }]);
    replies.activity_slots = ok([{ activity_id: 'a1', dow: 1, hour: 9, n: 4 }]);
    replies.settings = ok([{ time_zone: 'UTC', quiet_start: '22:00', quiet_end: '07:00', nudge_gap_hours: 5 }]);
    replies.weekly_reviews = ok([{ week_start: '2026-11-02' }]);
    const r = await refresh(window);
    expect(r.ok).toBe(true);
    expect(calls.map((c) => c.table).sort()).toEqual(['activities', 'activity_slots', 'categories', 'entries', 'settings', 'weekly_reviews']);
    const entryOps = calls.find((c) => c.table === 'entries')!.ops;
    expect(entryOps).toContainEqual(['gt', ['ended_at', window.since]]);
    expect(calls.find((c) => c.table === 'weekly_reviews')!.ops).toContainEqual(['gte', ['week_start', '2026-11-02']]);
    const copy = await readLocalCopy();
    expect(copy.entries.map((e) => e.id)).toEqual(['a', 'b']);
    expect(copy.entries.map((e) => e.activity_ids)).toEqual([['y', 'z'], []]);
    expect(copy.entries.every((e) => !('entry_activities' in e))).toBe(true);
    expect(copy.categories).toHaveLength(1);
    expect(copy.activities).toEqual([{ id: 'a1', name: 'Email', status: 'active', merged_into_id: null }]);
    expect(copy.slots).toEqual([{ activity_id: 'a1', dow: 1, hour: 9, n: 4 }]);
    const select = entryOps.find(([m]) => m === 'select')![1][0] as string;
    expect(select).toContain('entry_activities(activity_id, created_at)');
    // The old column must not be named, so dropping it cannot break a refresh (#79).
    expect(select.replace('entry_activities(activity_id, created_at)', '')).not.toContain('activity_id');
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

  it('keeps the old copy when the Activity reads fail', async () => {
    replies.entries = ok([entry('a')]);
    replies.activities = ok([{ id: 'a1', name: 'Email', status: 'active', merged_into_id: null }]);
    await refresh(window);
    const before = await readLocalCopy();
    replies.activity_slots = { data: null, error: { message: 'x' }, status: 503 };
    expect(await refresh(window)).toEqual({ ok: false, error: 'server' });
    expect(await readLocalCopy()).toEqual(before);
  });

  it('replaces Activities and slots, not merges them', async () => {
    replies.activities = ok([{ id: 'a1', name: 'Email', status: 'active', merged_into_id: null }]);
    replies.activity_slots = ok([{ activity_id: 'a1', dow: 1, hour: 9, n: 4 }]);
    await refresh(window);
    replies.activities = ok([]);
    replies.activity_slots = ok([]);
    await refresh(window);
    const copy = await readLocalCopy();
    expect(copy.activities).toEqual([]);
    expect(copy.slots).toEqual([]);
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
