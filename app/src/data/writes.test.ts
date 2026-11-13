import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;
type Reply = { data: unknown; error: unknown; status: number };

// A tiny in-memory Server for the entries table, plus recorded calls for everything else.
const server = { entries: new Map<string, Row>(), failNext: null as Reply | null, deleteBeforePatch: false };
const calls: { table: string; op: string; args: unknown[]; filter?: [string, unknown] }[] = [];
const rpcCalls: { name: string; args: unknown }[] = [];
let rpcReply: Reply = { data: {}, error: null, status: 200 };

function from(table: string) {
  let op = 'select';
  let payload: unknown;
  let opts: { ignoreDuplicates?: boolean; onConflict?: string } = {};
  let filter: [string, unknown] | undefined;
  const run = (): Reply => {
    calls.push({ table, op, args: [payload, opts], filter });
    if (server.failNext) {
      const f = server.failNext;
      server.failNext = null;
      return f;
    }
    if (table !== 'entries') return { data: [], error: null, status: 200 };
    const rows = server.entries;
    if (op === 'upsert') {
      const r = payload as Row;
      if (rows.has(r.id as string)) return { data: [], error: null, status: 201 };
      rows.set(r.id as string, { ...r });
      return { data: [{ ...r }], error: null, status: 201 };
    }
    if (op === 'update') {
      if (server.deleteBeforePatch) rows.delete(filter![1] as string);
      const row = rows.get(filter![1] as string);
      if (!row) return { data: [], error: null, status: 200 };
      Object.assign(row, payload);
      return { data: [{ ...row }], error: null, status: 200 };
    }
    if (op === 'delete') {
      rows.delete(filter![1] as string);
      return { data: null, error: null, status: 204 };
    }
    return { data: [], error: null, status: 200 };
  };
  const b: Record<string, unknown> = {
    upsert: (p: unknown, o: typeof opts) => ((op = 'upsert'), (payload = p), (opts = o), b),
    update: (p: unknown) => ((op = 'update'), (payload = p), b),
    delete: () => ((op = 'delete'), b),
    eq: (c: string, v: unknown) => ((filter = [c, v]), b),
    select: () => b,
    abortSignal: () => b,
    then: (ok: (r: Reply) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(run()).then(ok, bad),
  };
  return b;
}
function rpc(name: string, args: unknown) {
  rpcCalls.push({ name, args });
  const b = {
    abortSignal: () => b,
    then: (ok: (r: Reply) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(rpcReply).then(ok, bad),
  };
  return b;
}
let session: { user: { id: string } } | null = { user: { id: 'u1' } };
vi.mock('./supabase', () => ({
  supabase: { from, rpc, auth: { getSession: async () => ({ data: { session } }) } },
}));

const { createWrites } = await import('./writes');

const refresh = vi.fn(async () => ({ ok: true }));
const recordTiming = vi.fn(async () => {});
const w = createWrites({ refresh, recordTiming });

const fields = { text: 'email', started_at: '2026-11-08T01:00:00Z', ended_at: '2026-11-08T02:00:00Z', time_zone: 'UTC' };
const entry = { id: 'e1', form_opened_at: '2026-11-08T01:59:00Z', ...fields };

beforeEach(() => {
  server.entries.clear();
  server.failNext = null;
  calls.length = 0;
  rpcCalls.length = 0;
  rpcReply = { data: {}, error: null, status: 200 };
  refresh.mockClear();
  recordTiming.mockClear();
});

describe('createEntry', () => {
  it('inserts ignoring duplicates, then records timing and refreshes', async () => {
    const r = await w.createEntry(entry);
    expect(r.ok && r.data).toMatchObject({ id: 'e1', text: 'email' });
    expect(calls[0].args[1]).toEqual({ onConflict: 'id', ignoreDuplicates: true });
    expect(recordTiming).toHaveBeenCalledWith('save', expect.any(Number));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('a resend with the same id makes no duplicate and applies the form fields (AC-2.2)', async () => {
    await w.createEntry(entry);
    const r = await w.createEntry({ ...entry, text: 'email v2' });
    expect(server.entries.size).toBe(1);
    expect(r.ok && r.data).toMatchObject({ id: 'e1', text: 'email v2' });
    expect(calls.map((c) => c.op)).toEqual(['upsert', 'upsert', 'update']);
    expect(calls[2].filter).toEqual(['id', 'e1']);
    // the patch never sends form_opened_at
    expect(calls[2].args[0]).not.toHaveProperty('form_opened_at');
  });
  it('a lost response then a resend still ends with one Entry', async () => {
    server.failNext = { data: null, error: { message: 'Failed to fetch' }, status: 0 };
    expect(await w.createEntry(entry)).toEqual({ ok: false, error: 'unknown' });
    expect(refresh).not.toHaveBeenCalled();
    expect(recordTiming).not.toHaveBeenCalled();
    expect((await w.createEntry(entry)).ok).toBe(true);
    expect(server.entries.size).toBe(1);
  });
  it('a duplicate whose Entry was deleted since is entry_not_found', async () => {
    server.entries.set('e1', { ...entry });
    server.deleteBeforePatch = true;
    expect(await w.createEntry(entry)).toEqual({ ok: false, error: 'entry_not_found' });
    server.deleteBeforePatch = false;
    expect(refresh).not.toHaveBeenCalled();
  });
  it('passes validation errors through and does not refresh', async () => {
    server.failNext = { data: null, error: { message: 'violates check constraint "entry_text_empty"' }, status: 400 };
    expect(await w.createEntry(entry)).toEqual({ ok: false, error: 'entry_text_empty' });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('editEntry', () => {
  it('updates by id and returns the row', async () => {
    await w.createEntry(entry);
    const r = await w.editEntry('e1', { ...fields, text: 'changed' });
    expect(r.ok && r.data).toMatchObject({ text: 'changed' });
  });
  it('[] means entry_not_found', async () => {
    expect(await w.editEntry('missing', fields)).toEqual({ ok: false, error: 'entry_not_found' });
    expect(refresh).not.toHaveBeenCalled();
  });
  it('editing again with the same values is the same result (resend)', async () => {
    await w.createEntry(entry);
    const a = await w.editEntry('e1', fields);
    const b = await w.editEntry('e1', fields);
    expect(a).toEqual(b);
  });
});

describe('deleteEntry', () => {
  it('is idempotent', async () => {
    await w.createEntry(entry);
    expect((await w.deleteEntry('e1')).ok).toBe(true);
    expect((await w.deleteEntry('e1')).ok).toBe(true);
    expect(server.entries.size).toBe(0);
  });
});

describe('tag and category rpcs', () => {
  it('sets a Tag', async () => {
    expect((await w.setEntryTag('e1', 'c1')).ok).toBe(true);
    expect(rpcCalls).toEqual([{ name: 'set_entry_tag', args: { entry_id: 'e1', category_id: 'c1' } }]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('approves and rejects', async () => {
    await w.approveCategory('c1');
    await w.rejectCategory('c2');
    expect(rpcCalls.map((c) => c.name)).toEqual(['approve_category', 'reject_category']);
    expect(rpcCalls[1].args).toEqual({ category_id: 'c2' });
  });
  it('passes the error key through', async () => {
    rpcReply = { data: null, error: { message: 'category_not_active' }, status: 400 };
    expect(await w.setEntryTag('e1', 'c1')).toEqual({ ok: false, error: 'category_not_active' });
    rpcReply = { data: null, error: { message: 'entry_not_found' }, status: 400 };
    expect(await w.setEntryTag('e1', 'c1')).toEqual({ ok: false, error: 'entry_not_found' });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('activity rpcs', () => {
  it('sets, clears, renames and merges, refreshing after each', async () => {
    await w.setEntryActivities('e1', ['Email']);
    await w.setEntryActivities('e1', []);
    await w.renameActivity('a1', 'Mail');
    await w.mergeActivity('a1', 'a2');
    expect(rpcCalls).toEqual([
      { name: 'set_entry_activities', args: { p_entry_id: 'e1', p_names: ['Email'] } },
      { name: 'set_entry_activities', args: { p_entry_id: 'e1', p_names: [] } },
      { name: 'rename_activity', args: { p_id: 'a1', p_name: 'Mail' } },
      { name: 'merge_activity', args: { p_from: 'a1', p_into: 'a2' } },
    ]);
    expect(refresh).toHaveBeenCalledTimes(4);
    expect(recordTiming).toHaveBeenCalledTimes(4);
  });
  it('sets the list of Activities with one rpc, refreshing after', async () => {
    await w.setEntryActivities('e1', ['Email', 'Gym']);
    await w.setEntryActivities('e1', []);
    expect(rpcCalls).toEqual([
      { name: 'set_entry_activities', args: { p_entry_id: 'e1', p_names: ['Email', 'Gym'] } },
      { name: 'set_entry_activities', args: { p_entry_id: 'e1', p_names: [] } },
    ]);
    expect(refresh).toHaveBeenCalledTimes(2);
    rpcReply = { data: null, error: { message: 'too_many_activities' }, status: 400 };
    expect((await w.setEntryActivities('e1', ['a', 'b', 'c', 'd'])).ok).toBe(false);
  });
  it('passes the error keys through and does not refresh', async () => {
    rpcReply = { data: null, error: { message: 'activity_name_taken' }, status: 400 };
    expect(await w.renameActivity('a1', 'Mail')).toEqual({ ok: false, error: 'activity_name_taken' });
    rpcReply = { data: null, error: { message: 'activity_name_blank' }, status: 400 };
    expect(await w.renameActivity('a1', ' ')).toEqual({ ok: false, error: 'activity_name_blank' });
    rpcReply = { data: null, error: { message: 'activity_name_too_long' }, status: 400 };
    expect(await w.setEntryActivities('e1', ['x'.repeat(61)])).toEqual({ ok: false, error: 'activity_name_too_long' });
    rpcReply = { data: null, error: { message: 'activity_not_found' }, status: 400 };
    expect(await w.mergeActivity('a1', 'a1')).toEqual({ ok: false, error: 'activity_not_found' });
    rpcReply = { data: null, error: { message: 'entry_not_found' }, status: 400 };
    expect(await w.setEntryActivities('e1', ['x'])).toEqual({ ok: false, error: 'entry_not_found' });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('every update and delete carries a filter (CLAUDE.md)', () => {
  it('Entry edit, delete and settings updates are filtered', async () => {
    await w.createEntry(entry);
    await w.editEntry('e1', fields);
    await w.deleteEntry('e1');
    await w.saveSettings({ quiet_start: '22:00' });
    const writes = calls.filter((c) => c.op === 'update' || c.op === 'delete');
    expect(writes.map((c) => c.op)).toEqual(['update', 'delete', 'update']);
    expect(writes.map((c) => c.filter)).toEqual([['id', 'e1'], ['id', 'e1'], ['user_id', 'u1']]);
  });
  it('the Activity writes are rpcs, so they send no table update or delete', async () => {
    await w.setEntryActivities('e1', ['Email']);
    await w.renameActivity('a1', 'Mail');
    await w.mergeActivity('a1', 'a2');
    expect(calls).toHaveLength(0);
  });
});

describe('reviewDone, settings, push', () => {
  it('reviewDone ignores duplicates and [] counts as done', async () => {
    const r = await w.reviewDone('2026-11-02');
    expect(r.ok).toBe(true);
    expect(calls[0]).toMatchObject({ table: 'weekly_reviews', op: 'upsert' });
    expect(calls[0].args).toEqual([{ week_start: '2026-11-02' }, { onConflict: 'user_id,week_start', ignoreDuplicates: true }]);
  });
  it('saveSettings sends only the given fields', async () => {
    await w.saveSettings({ quiet_start: '22:00', quiet_end: '07:00' });
    expect(calls[0]).toMatchObject({ table: 'settings', op: 'update' });
    expect(calls[0].args[0]).toEqual({ quiet_start: '22:00', quiet_end: '07:00' });
    expect(calls[0].filter).toEqual(['user_id', 'u1']);
  });
  it('saveSettings without a session is session_lost and sends nothing', async () => {
    session = null;
    expect(await w.saveSettings({ quiet_start: '22:00' })).toEqual({ ok: false, error: 'session_lost' });
    expect(calls).toHaveLength(0);
    session = { user: { id: 'u1' } };
  });
  it('saveSettings maps quiet_hours_equal', async () => {
    server.failNext = { data: null, error: { message: 'violates check constraint "quiet_hours_equal"' }, status: 400 };
    expect(await w.saveSettings({ quiet_start: '07:00', quiet_end: '07:00' })).toEqual({ ok: false, error: 'quiet_hours_equal' });
  });
  it('saveSettings sends nudge_gap_hours', async () => {
    await w.saveSettings({ nudge_gap_hours: 5 });
    expect(calls[0].args[0]).toEqual({ nudge_gap_hours: 5 });
    expect(calls[0].filter).toEqual(['user_id', 'u1']);
  });
  it('saveSettings maps nudge_gap_out_of_range', async () => {
    server.failNext = { data: null, error: { message: 'violates check constraint "nudge_gap_out_of_range"' }, status: 400 };
    expect(await w.saveSettings({ nudge_gap_hours: 13 })).toEqual({ ok: false, error: 'nudge_gap_out_of_range' });
  });
  it('upserts a push subscription on endpoint, without refreshing', async () => {
    const sub = { endpoint: 'https://push/x', p256dh: 'k', auth: 'a' };
    expect((await w.upsertPushSubscription(sub)).ok).toBe(true);
    expect(calls[0].args).toEqual([sub, { onConflict: 'endpoint' }]);
    expect(refresh).not.toHaveBeenCalled();
    expect(recordTiming).toHaveBeenCalled();
  });
});

describe('after a confirmed write', () => {
  it('a failing refresh does not fail the write', async () => {
    refresh.mockRejectedValueOnce(new Error('offline'));
    expect((await w.deleteEntry('e1')).ok).toBe(true);
  });
});
