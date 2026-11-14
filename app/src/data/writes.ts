import type { Database, Json } from './database.types';
import type { ErrorKey, PostgrestLikeError } from './errors';
import { request, type Result } from './request';
import { supabase } from './supabase';

type Tables = Database['public']['Tables'];

type SetActivityTargetGenerated = Database['public']['Functions']['set_activity_target']['Args'];
/** The generated type says `string` and `number`: the args have no default, but the SQL function accepts null for both. */
type SetActivityTargetArgs = { p_activity_id: string; p_category_id: string | null; p_minutes: number | null };

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

/** Asking for insights runs the AI on the Server (design: up to 120 s), so it gets more than the usual 10 s. */
export const INSIGHTS_TIMEOUT_MS = 150_000;

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

  /** Set the Entry's Activities (0 to 3 names; none = empty list), source me. Needs a connection. */
  const setEntryActivities = (entryId: string, names: string[]) =>
    rpc((signal) => supabase.rpc('set_entry_activities', { p_entry_id: entryId, p_names: names }).abortSignal(signal));
  const renameActivity = (id: string, name: string) =>
    rpc((signal) => supabase.rpc('rename_activity', { p_id: id, p_name: name }).abortSignal(signal));
  /** Moves `from`'s Entries and names into `into`. Repeating a done merge is fine. */
  const mergeActivity = (from: string, into: string) =>
    rpc((signal) => supabase.rpc('merge_activity', { p_from: from, p_into: into }).abortSignal(signal));

  /** Set (or clear, with null minutes) the weekly target of an Activity, narrowed to a Category or `null` for any. 30–4800 minutes. */
  const setActivityTarget = (activityId: string, categoryId: string | null, minutes: number | null) => {
    const args: SetActivityTargetArgs = { p_activity_id: activityId, p_category_id: categoryId, p_minutes: minutes };
    return rpc((signal) => supabase.rpc('set_activity_target', args as SetActivityTargetGenerated).abortSignal(signal));
  };

  /**
   * Both the new row (`201`) and an already-done week (`[]`) mean done. `note` is the one change for next week (at most 140
   * characters; a blank one is not sent). A week already done keeps its first note.
   */
  async function reviewDone(weekStart: string, note?: string | null) {
    const nextChange = note?.trim();
    const started = performance.now();
    const r = await request((signal) =>
      supabase
        .from('weekly_reviews')
        .upsert(nextChange ? { week_start: weekStart, next_change: nextChange } : { week_start: weekStart }, { onConflict: 'user_id,week_start', ignoreDuplicates: true })
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

  // ---- Insights (#80) ----
  /** Make it next week's change (this or last week's card); replaces another accepted card of that week. */
  const acceptInsight = (id: string) => rpc((signal) => supabase.rpc('accept_insight', { p_id: id }).abortSignal(signal));
  /** Not useful, with an optional one-line reason (1-140 characters); calling it again adds or changes the reason. */
  const dismissInsight = (id: string, reason?: string | null) =>
    rpc((signal) => supabase.rpc('dismiss_insight', reason?.trim() ? { p_id: id, p_reason: reason.trim() } : { p_id: id }).abortSignal(signal));
  /** Undo a dismiss or an accept. */
  const undoInsight = (id: string) => rpc((signal) => supabase.rpc('undo_insight', { p_id: id }).abortSignal(signal));
  /** Keep the running change one more week. */
  const keepChange = (id: string) => rpc((signal) => supabase.rpc('keep_change', { p_id: id }).abortSignal(signal));
  /** My version of the coach note (at most 1200 characters); '' clears it. */
  const setCoachNote = (body: string) => rpc((signal) => supabase.rpc('set_coach_note', { p_body: body }).abortSignal(signal));

  /**
   * New insights for this or last week now (at most once an hour). The Server runs the AI, so it can take a minute.
   * 429 = too_soon, 400 = week_not_allowed; refreshes the Local copy when it answers.
   */
  async function requestInsights(weekStart: string): Promise<Result<{ status: string; saved: number }>> {
    const started = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke('insights', {
        body: { week_start: weekStart },
        timeout: INSIGHTS_TIMEOUT_MS,
      });
      if (error) {
        const status = (error as { context?: { status?: number } }).context?.status ?? 0;
        if (status === 401) return fail('session_lost');
        if (status === 429) return fail('too_soon');
        if (status === 400) return fail('week_not_allowed');
        if (status === 409) return fail('time_zone_unknown');
        return fail(status === 0 ? 'unknown' : 'server');
      }
      return confirmed(started, { ok: true as const, data: data as { status: string; saved: number } });
    } catch {
      return fail('unknown');
    }
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
    setEntryActivities,
    renameActivity,
    mergeActivity,
    setActivityTarget,
    reviewDone,
    acceptInsight,
    dismissInsight,
    undoInsight,
    keepChange,
    setCoachNote,
    requestInsights,
    saveSettings,
    upsertPushSubscription,
  };
}

export type Writes = ReturnType<typeof createWrites>;
