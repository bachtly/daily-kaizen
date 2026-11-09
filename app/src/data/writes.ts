import type { Database, Json } from './database.types';
import type { ErrorKey, PostgrestLikeError } from './errors';
import { request, type Result } from './request';
import { supabase } from './supabase';

type Tables = Database['public']['Tables'];

export type EntryFields = Pick<Tables['entries']['Row'], 'text' | 'started_at' | 'ended_at' | 'time_zone'>;
export type NewEntry = EntryFields & Pick<Tables['entries']['Row'], 'id' | 'form_opened_at'>;
export type SettingsPatch = Partial<Pick<Tables['settings']['Row'], 'time_zone' | 'quiet_start' | 'quiet_end' | 'nudge_gap_hours'>>;
export type PushSubscriptionInput = Pick<Tables['push_subscriptions']['Row'], 'endpoint' | 'p256dh' | 'auth'>;

/** Injected so this module does not import the Local copy (the caller wires `refresh` and `recordTiming`). */
export type WriteDeps = {
  /** Refresh the Local copy; called after every confirmed write. Its failure never fails the write. */
  refresh: () => Promise<unknown>;
  /** Keep a save duration in ms (Server confirmation time, success only). */
  recordTiming: (kind: 'save', ms: number) => Promise<unknown>;
};

const fail = (error: ErrorKey): Result<never> => ({ ok: false, error });

/**
 * Phone writes (04-api Contracts). Each is safe to resend after an unknown result (AC-2.2).
 * A write is "confirmed" when the Server answers; only then does it record its duration and refresh (AC-2.1, AC-2.3).
 */
export function createWrites({ refresh, recordTiming }: WriteDeps) {
  async function confirmed<T>(started: number, r: Result<T>, refreshAfter = true): Promise<Result<T>> {
    if (!r.ok) return r;
    await recordTiming('save', performance.now() - started).catch(() => {});
    if (refreshAfter) await Promise.resolve(refresh()).catch(() => {});
    return r;
  }

  async function patchEntry(id: string, fields: EntryFields) {
    const r = await request((signal) =>
      supabase.from('entries').update(fields).eq('id', id).select().abortSignal(signal),
    );
    if (!r.ok) return r;
    // 200 [] = the Entry no longer exists
    return r.data.length === 0 ? fail('entry_not_found') : { ok: true as const, data: r.data[0] };
  }

  /**
   * Insert ignoring a duplicate id. If the id already exists (a resend), send the form's fields as an edit with that id
   * and return that result, so the form never creates a second Entry.
   */
  async function createEntry(entry: NewEntry) {
    const started = performance.now();
    const created = await request((signal) =>
      supabase.from('entries').upsert(entry, { onConflict: 'id', ignoreDuplicates: true }).select().abortSignal(signal),
    );
    if (!created.ok) return created;
    if (created.data.length > 0) return confirmed(started, { ok: true as const, data: created.data[0] });
    const { id, text, started_at, ended_at, time_zone } = entry;
    return confirmed(started, await patchEntry(id, { text, started_at, ended_at, time_zone }));
  }

  async function editEntry(id: string, fields: EntryFields) {
    const started = performance.now();
    return confirmed(started, await patchEntry(id, fields));
  }

  /** Idempotent: deleting twice is fine. */
  async function deleteEntry(id: string) {
    const started = performance.now();
    const r = await request((signal) => supabase.from('entries').delete().eq('id', id).abortSignal(signal));
    return confirmed(started, r.ok ? { ok: true as const, data: undefined } : r);
  }

  async function rpc(call: (signal: AbortSignal) => PromiseLike<{ data: Json | null; error: PostgrestLikeError | null; status: number }>) {
    const started = performance.now();
    return confirmed(started, await request<Json | null>(call));
  }

  const setEntryTag = (entryId: string, categoryId: string) =>
    rpc((signal) => supabase.rpc('set_entry_tag', { entry_id: entryId, category_id: categoryId }).abortSignal(signal));
  const approveCategory = (categoryId: string) =>
    rpc((signal) => supabase.rpc('approve_category', { category_id: categoryId }).abortSignal(signal));
  const rejectCategory = (categoryId: string) =>
    rpc((signal) => supabase.rpc('reject_category', { category_id: categoryId }).abortSignal(signal));

  /** Both the new row (`201`) and an already-done week (`[]`) mean done. */
  async function reviewDone(weekStart: string) {
    const started = performance.now();
    const r = await request((signal) =>
      supabase
        .from('weekly_reviews')
        .upsert({ week_start: weekStart }, { onConflict: 'user_id,week_start', ignoreDuplicates: true })
        .select()
        .abortSignal(signal),
    );
    return confirmed(started, r.ok ? { ok: true as const, data: undefined } : r);
  }

  async function saveSettings(patch: SettingsPatch) {
    const started = performance.now();
    // PostgREST (pg_safeupdate) refuses an UPDATE with no WHERE, so filter by the signed-in user.
    const { data: auth } = await supabase.auth.getSession();
    const userId = auth.session?.user.id;
    if (!userId) return fail('session_lost');
    const r = await request((signal) =>
      supabase.from('settings').update(patch).eq('user_id', userId).select().abortSignal(signal),
    );
    return confirmed(started, r.ok ? { ok: true as const, data: r.data[0] ?? null } : r);
  }

  /** Same endpoint again just sets the same values. Not part of the Local copy, so no refresh. */
  async function upsertPushSubscription(sub: PushSubscriptionInput) {
    const started = performance.now();
    const r = await request((signal) =>
      supabase.from('push_subscriptions').upsert(sub, { onConflict: 'endpoint' }).abortSignal(signal),
    );
    return confirmed(started, r.ok ? { ok: true as const, data: undefined } : r, false);
  }

  return {
    createEntry,
    editEntry,
    deleteEntry,
    setEntryTag,
    approveCategory,
    rejectCategory,
    reviewDone,
    saveSettings,
    upsertPushSubscription,
  };
}

export type Writes = ReturnType<typeof createWrites>;
