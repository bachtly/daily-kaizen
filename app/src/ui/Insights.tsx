import { useState } from 'react';
import type { EntryRow, InsightRow } from '../data/db';
import { type ChangeResult, MIN_LOGGED_DAYS, resultLine, SHOWN_FIRST } from '../data/insights';
import type { Result } from '../data/request';
import { hhmm, shortDate } from './weekFormat';

/** Phone writes the Insights panel makes. Each resolves when the Server answers. */
export type InsightActions = {
  accept: (id: string) => Promise<Result<unknown>>;
  dismiss: (id: string, reason?: string) => Promise<Result<unknown>>;
  undo: (id: string) => Promise<Result<unknown>>;
  keep: (id: string) => Promise<Result<unknown>>;
  /** New insights for the week shown now (the AI runs on the Server). */
  request: () => Promise<Result<unknown>>;
};

type Evidence = { label: string; source: string; shows: string; against?: string; limits: string; url: string };

const MESSAGES: Record<string, string> = {
  unknown: 'Needs a connection.',
  too_soon: 'You can ask again in an hour.',
  insight_too_old: 'This card is too old to start a change from.',
  reason_too_long: 'Keep it to 140 characters.',
  change_not_running: 'This change is no longer running.',
};
const messageFor = (r: Result<unknown>) => (r.ok ? '' : MESSAGES[r.error] ?? "Couldn't save. Try again.");

function InsightCard({ ins, entries, tz, online, accepted, onAccept, onDismiss }: {
  ins: InsightRow;
  entries: readonly EntryRow[];
  tz: string;
  online: boolean;
  accepted: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const e = ins.evidence as unknown as Evidence;
  const mine = entries.filter((x) => ins.entry_ids.includes(x.id));
  return (
    <article className="ins" aria-labelledby={`ins-${ins.id}-f`}>
      <p className="f" id={`ins-${ins.id}-f`}>{ins.finding}</p>
      <p className="d">{ins.detail}</p>
      {ins.may_not_apply && <p className="mna">May not apply to you: {ins.may_not_apply}</p>}
      <p className="try"><b>Try:</b> {ins.try_this}</p>
      <button className="ev" aria-expanded={open} aria-controls={`ins-${ins.id}-ev`} onClick={() => setOpen(!open)}>
        <span>Why: {e.label}</span><small>{open ? 'Hide' : 'Show'}</small>
      </button>
      {open && (
        <div className="evd" id={`ins-${ins.id}-ev`}>
          <p><span className="k">What it showed</span>{e.shows}</p>
          {e.against && <p><span className="k">Against</span>{e.against}</p>}
          <p><span className="k">Limits</span>{e.limits}</p>
          <p><a href={e.url} target="_blank" rel="noreferrer">{e.source}</a></p>
        </div>
      )}
      <div className="row">
        {accepted
          ? <span className="changed">Next week’s change ✓</span>
          : <button className="primary small" onClick={onAccept} disabled={!online}>Make it next week’s change</button>}
        <span className="row2">
          {mine.length > 0 && (
            <button className="link" style={{ fontSize: 14 }} aria-expanded={showEntries} onClick={() => setShowEntries(!showEntries)}>
              {showEntries ? 'Hide Entries' : `See ${mine.length} Entries`}
            </button>
          )}
          <button className="link" style={{ fontSize: 14 }} onClick={onDismiss} disabled={!online}>Not useful</button>
        </span>
      </div>
      {showEntries && (
        <ul className="ents">
          {mine.map((x) => (
            <li key={x.id}>
              <span className="t">{shortDate(Date.parse(x.started_at), tz)} {hhmm(Date.parse(x.started_at), tz)}</span>{x.text}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** The line held outside the list after "Not useful": Undo, and an optional reason the coach reads. */
function HiddenLine({ onUndo, onReason }: { onUndo: () => void; onReason: (reason: string) => Promise<Result<unknown>> }) {
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | string>('idle');
  return (
    <div className="hid" role="status">
      <div className="top">
        <span>Hidden for 8 weeks</span>
        <button className="link" onClick={onUndo}>Undo</button>
      </div>
      {state === 'saved' ? <p className="saved">Saved. The coach will take it into account.</p> : (
        <form onSubmit={(ev) => {
          ev.preventDefault();
          if (!reason.trim() || state === 'saving') return;
          setState('saving');
          void onReason(reason.trim()).then((r) => setState(r.ok ? 'saved' : messageFor(r)));
        }}>
          <input aria-label="Why not useful? (optional)" placeholder="Why? (optional)" maxLength={140}
            value={reason} onChange={(ev) => setReason(ev.target.value)} />
          <button className="secondary" type="submit" disabled={!reason.trim() || state === 'saving'}>Save</button>
        </form>
      )}
      {state !== 'idle' && state !== 'saving' && state !== 'saved' && <p className="error" role="alert">{state}</p>}
    </div>
  );
}

/** Up to 3 insight cards, then See more (design §10); too early and empty states; Get insights now / Update. */
export function InsightsPanel({ cards, loggedDays, entries, tz, online, canRequest, stale, actions }: {
  cards: readonly InsightRow[];
  loggedDays: number;
  entries: readonly EntryRow[];
  tz: string;
  online: boolean;
  /** this or last week, where asking for insights is allowed */
  canRequest: boolean;
  /** Entries changed since the cards were made */
  stale: boolean;
  actions?: InsightActions;
}) {
  const [all, setAll] = useState(false);
  const [hidden, setHidden] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState('');
  const run = async (p: Promise<Result<unknown>>) => {
    const r = await p;
    setMessage(messageFor(r));
    return r;
  };
  const ask = async () => {
    if (!actions || asking) return;
    if (!online) { setMessage(MESSAGES.unknown); return; }
    setAsking(true);
    setMessage('');
    await run(actions.request());
    setAsking(false);
  };
  // A card I just dismissed goes at once, before the Local copy is read again.
  const visible = cards.filter((c) => c.id !== hidden);
  const shown = all ? visible : visible.slice(0, SHOWN_FIRST);
  const rest = visible.length - SHOWN_FIRST;
  const accepted = cards.find((c) => c.status === 'accepted')?.id;
  const askButton = (label: string) => canRequest && actions && (
    <button className="secondary more" onClick={() => void ask()} disabled={asking}>{asking ? 'Thinking… this can take a minute' : label}</button>
  );

  return (
    <section className="panel" aria-labelledby="ins-h">
      <h2 id="ins-h">Insights</h2>
      {cards.length === 0 && loggedDays < MIN_LOGGED_DAYS ? (
        <p className="ins-sub">Insights appear after {MIN_LOGGED_DAYS} logged days. {loggedDays} so far.</p>
      ) : cards.length === 0 ? (
        <>
          <p className="ins-sub">New insights come on Sunday at 18:00.</p>
          {askButton('Get insights now')}
        </>
      ) : (
        <>
          <p className="ins-sub">From this week’s log, most hours to win first. Each one says why it might help.</p>
          {shown.map((c) => (
            <InsightCard key={c.id} ins={c} entries={entries} tz={tz} online={online} accepted={c.id === accepted}
              onAccept={() => actions && void run(actions.accept(c.id))}
              onDismiss={() => {
                if (!actions) return;
                setHidden(c.id);
                void run(actions.dismiss(c.id));
              }} />
          ))}
          {rest > 0 && (
            <button className="secondary more" aria-expanded={all} onClick={() => setAll(!all)}>
              {all ? 'Show fewer' : `See ${rest} more`}
            </button>
          )}
          {stale && askButton('Update insights')}
        </>
      )}
      {hidden && actions && (
        <HiddenLine
          key={hidden}
          onUndo={() => { void run(actions.undo(hidden)); setHidden(null); }}
          onReason={(reason) => actions.dismiss(hidden, reason)}
        />
      )}
      <p className={message ? 'error' : 'status'} role="status" aria-live="polite">{message}</p>
    </section>
  );
}

/** The change running this week, or last week's with its result (design §8). */
export function ChangeCard({ change, running, canKeep, online, onKeep }: {
  change: InsightRow;
  /** the change runs in the week shown */
  running: boolean;
  canKeep: boolean;
  online: boolean;
  onKeep?: () => Promise<Result<unknown>>;
}) {
  const [message, setMessage] = useState('');
  const r = change.result as unknown as ChangeResult | null;
  return (
    <div className="lastweek">
      <p>{running ? 'This week’s change' : 'Last week’s change'}: “{change.try_this}”</p>
      {r && <p className="res">{resultLine(r)}{r.final ? '' : ' so far'}</p>}
      {running && canKeep && onKeep && (
        <div className="row">
          <button className="link" disabled={!online} onClick={() => void onKeep().then((x) => setMessage(messageFor(x)))}>
            Keep it one more week
          </button>
        </div>
      )}
      {message && <p className="error" role="alert">{message}</p>}
    </div>
  );
}
