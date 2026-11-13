import { useState } from 'react';
import { NO_ACTIVITY, type ActivityTotal } from '../data/activities';
import type { ActivityRow, CategoryRow } from '../data/db';
import type { Result } from '../data/request';
import { categoryColour, formatDuration } from './weekFormat';

/** Phone writes the panel can make. Each resolves when the Server answers. */
export type ActivityActions = {
  renameActivity: (id: string, name: string) => Promise<Result<unknown>>;
  mergeActivity: (from: string, into: string) => Promise<Result<unknown>>;
};

type Mode = 'rename' | 'merge' | undefined;

const messageFor = (error: string) =>
  error === 'activity_name_taken' ? 'You already have an Activity with that name.'
  : error === 'activity_not_found' ? 'That Activity is gone.'
  : error === 'unknown' ? 'Needs a connection.'
  : "Couldn't save. Try again.";

function Split({ total, categories }: { total: ActivityTotal; categories: readonly CategoryRow[] }) {
  const rows = categories
    .filter((c) => (total.byCategory[c.id] ?? 0) > 0)
    .map((c) => ({ id: c.id, label: c.name, ms: total.byCategory[c.id], colour: categoryColour(c.name) }));
  if (total.untaggedMs > 0) rows.push({ id: 'untagged', label: 'Untagged', ms: total.untaggedMs, colour: 'var(--neutral-bar)' });
  return (
    <ul className="act-split">
      {rows.map((r) => (
        <li key={r.id}>
          <span className="swatch" aria-hidden="true" style={{ background: r.colour }} />
          <span>{r.label}</span>
          <span className="val">{formatDuration(r.ms)}</span>
        </li>
      ))}
    </ul>
  );
}

function Manage({ activity, others, online, actions }: {
  activity: ActivityRow; others: readonly ActivityRow[]; online: boolean; actions: ActivityActions;
}) {
  const [mode, setMode] = useState<Mode>();
  const [name, setName] = useState(activity.name);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  // A done write refreshes the Local copy, which re-renders the panel; a refusal keeps the form open with its message.
  const run = async (call: () => Promise<Result<unknown>>) => {
    if (busy) return;
    if (!online) { setMessage('Needs a connection.'); return; }
    setBusy(true);
    setMessage(undefined);
    const r = await call();
    setBusy(false);
    if (r.ok) { setMode(undefined); return; }
    if (r.error === 'session_lost') return; // the Signed out banner already says it
    setMessage(messageFor(r.error));
  };
  const close = () => { setMode(undefined); setMessage(undefined); };

  return (
    <div className="act-manage">
      {mode === undefined && (
        <div className="row-actions">
          <button className="secondary" disabled={!online} onClick={() => { setName(activity.name); setMessage(undefined); setMode('rename'); }}>Rename</button>
          <button className="secondary" disabled={!online || others.length === 0} onClick={() => { setMessage(undefined); setMode('merge'); }}>Merge into…</button>
        </div>
      )}
      {mode === 'rename' && (
        <form onSubmit={(e) => { e.preventDefault(); void run(() => actions.renameActivity(activity.id, name)); }}>
          <label>
            <span className="sr-only">Activity name</span>
            <input className="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-invalid={message ? true : undefined} />
          </label>
          <div className="row-actions">
            <button className="secondary" type="submit" disabled={busy || !online || name.trim() === ''}>Save</button>
            <button className="secondary" type="button" onClick={close}>Cancel</button>
          </div>
        </form>
      )}
      {mode === 'merge' && (
        <>
          <p className="note" style={{ marginTop: 0 }}>Move everything in {activity.name} into:</p>
          <ul className="act-pick">
            {others.map((o) => (
              <li key={o.id}>
                <button disabled={busy || !online} onClick={() => void run(() => actions.mergeActivity(activity.id, o.id))}>{o.name}</button>
              </li>
            ))}
          </ul>
          <div className="row-actions">
            <button className="secondary" onClick={close}>Cancel</button>
          </div>
        </>
      )}
      {message && <p className="error" role="alert">{message}</p>}
    </div>
  );
}

/**
 * Time per Activity, each row split by Category (AC-8.5). Tap a row for the split and, for a real Activity, Rename and
 * Merge into… (AC-8.3). Hidden while the user has no Activities. Every bar has its text value, so colour is never the only signal.
 */
export function ActivityTotals({ totals, activities, categories, online, actions }: {
  totals: readonly ActivityTotal[];
  activities: readonly ActivityRow[];
  categories: readonly CategoryRow[];
  online: boolean;
  actions?: ActivityActions;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (activities.length === 0 || totals.length === 0) return null;
  const byId = new Map(activities.map((a) => [a.id, a]));
  const active = activities.filter((a) => a.status === 'active');
  const max = Math.max(...totals.map((t) => t.totalMs), 1);
  const parts = (t: ActivityTotal) => [
    ...categories.filter((c) => (t.byCategory[c.id] ?? 0) > 0).map((c) => ({ ms: t.byCategory[c.id], colour: categoryColour(c.name) })),
    ...(t.untaggedMs > 0 ? [{ ms: t.untaggedMs, colour: 'var(--neutral-bar)' }] : []),
  ];

  return (
    <section className="panel" aria-labelledby="acts-h">
      <h2 id="acts-h">Time per activity</h2>
      <ul className="acts">
        {totals.map((t) => {
          const key = t.activityId ?? 'none';
          const activity = t.activityId ? byId.get(t.activityId) : undefined;
          const label = activity?.name ?? NO_ACTIVITY;
          const isOpen = open === key;
          return (
            <li key={key} className={t.activityId ? undefined : 'neutral'}>
              <button className="act-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : key)}>
                <span className="name">{label}</span>
                <span className="stack" style={{ width: `${(t.totalMs / max) * 100}%` }} aria-hidden="true">
                  {parts(t).map((c, i) => <span key={i} style={{ flex: c.ms, background: c.colour }} />)}
                </span>
                <span className="val">{formatDuration(t.totalMs)}</span>
                <span aria-hidden="true">{isOpen ? '▾' : '›'}</span>
              </button>
              {isOpen && (
                <>
                  <Split total={t} categories={categories} />
                  {activity && actions && (
                    <Manage activity={activity} others={active.filter((a) => a.id !== activity.id)} online={online} actions={actions} />
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
