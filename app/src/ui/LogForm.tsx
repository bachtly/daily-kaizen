import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EntryRow } from '../data/db';
import { onCopyChanged } from '../data/copyChanged';
import { readLocalCopy } from '../data/localCopy';
import { findOverlaps, prefill, recentTexts } from '../data/prefill';
import type { Result } from '../data/request';
import type { NewEntry } from '../data/writes';
import { deviceZone, writes } from './liveWrites';
import { OverlapNote } from './OverlapNote';
import { ConnectionBanner, Phone, type Connection } from './Phone';
import { RecentChips } from './RecentChips';
import { SaveStatus, type SaveState } from './SaveStatus';
import { TimeChip } from './TimeChip';
import { hhmm, withTime } from './weekFormat';

type LogEntry = Pick<EntryRow, 'id' | 'text' | 'started_at' | 'ended_at' | 'created_at'>;

export type LogFormViewProps = {
  /** Entries in the Local copy (current and previous week). */
  entries: readonly LogEntry[];
  timeZone: string;
  /** Current time in ms; the live wrapper ticks it. */
  now: number;
  connection?: Connection;
  /** Resolves when the Server answers; `unknown` means the result is not known and a resend is safe. */
  onSave: (entry: NewEntry) => Promise<Result<unknown>>;
  /** Freeze the form in a state for review (stories). */
  frozen?: 'saving' | 'saved';
  initialText?: string;
  /** Start the form with From already changed (ms), for stories. */
  initialFrom?: number;
};

const fieldMessage = {
  entry_text_empty: 'Write what you did.',
  entry_end_not_after_start: 'From must be before To.',
  entry_end_in_future: "To can't be later than now.",
} as const;
type FieldKey = keyof typeof fieldMessage;

const newDraft = () => ({ id: crypto.randomUUID(), openedAt: new Date().toISOString() });

/** Log form: the screen the app opens on. Only the text is required; times are prefilled (AC-1.1). */
export function LogFormView({ entries, timeZone, now, connection = 'online', onSave, frozen, initialText = '', initialFrom }: LogFormViewProps) {
  const [text, setText] = useState(initialText);
  const [fromEdit, setFromEdit] = useState<number | null>(initialFrom ?? null);
  const [toEdit, setToEdit] = useState<number | null>(null);
  const [state, setState] = useState<SaveState>(frozen ?? 'idle');
  const [fieldError, setFieldError] = useState<FieldKey>();
  const [sessionLost, setSessionLost] = useState(false);
  // One id per draft: a resend after an unknown result reuses it so it cannot create a second Entry (AC-2.2).
  const draft = useRef(newDraft());
  const saving = state === 'saving';

  const pre = useMemo(() => prefill(entries, now, timeZone), [entries, now, timeZone]);
  const from = fromEdit ?? pre.start;
  const to = toEdit ?? now;

  const edit = (next: string) => {
    // Clearing the text starts a fresh form; typing keeps the id and the time the form was shown (NFR-1).
    if (!next.trim()) draft.current = newDraft();
    setText(next);
    setFieldError(undefined);
    if (state !== 'saving' && !frozen) setState('idle');
  };

  const timeError: FieldKey | undefined =
    fieldError === 'entry_end_in_future' || to > now ? 'entry_end_in_future'
    : fieldError === 'entry_end_not_after_start' || from >= to ? 'entry_end_not_after_start'
    : undefined;
  const textError = fieldError === 'entry_text_empty' ? fieldError : undefined;

  const overlap = useMemo(() => (from < to ? findOverlaps(entries, from, to)[0] : undefined), [entries, from, to]);
  const overlapLabel =
    overlap && `${overlap.text} ${hhmm(Date.parse(overlap.started_at), timeZone)}–${hhmm(Date.parse(overlap.ended_at), timeZone)}`;
  const recent = useMemo(() => recentTexts(entries), [entries]);

  const save = async () => {
    if (saving || frozen || !text.trim() || timeError) return;
    setState('saving');
    setFieldError(undefined);
    const r = await onSave({
      id: draft.current.id,
      form_opened_at: draft.current.openedAt,
      text: text.trim(),
      started_at: new Date(from).toISOString(),
      ended_at: new Date(toEdit ?? now).toISOString(),
      time_zone: timeZone,
    });
    if (r.ok) {
      setState('saved');
      setText('');
      setFromEdit(null);
      setToEdit(null);
      setSessionLost(false);
      draft.current = newDraft();
    } else if (r.error === 'session_lost') {
      setSessionLost(true); // the text stays
      setState('idle');
    } else if (r.error in fieldMessage) {
      setFieldError(r.error as FieldKey);
      setState('idle');
    } else {
      setState(r.error === 'unknown' ? 'unknown' : 'server');
    }
  };

  // Shown again with empty text (app foregrounded): a fresh form with new prefill.
  const textRef = useRef(text);
  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || textRef.current.trim()) return;
      draft.current = newDraft();
      setFromEdit(null);
      setToEdit(null);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // "Saved." goes away after 2 s.
  useEffect(() => {
    if (state !== 'saved' || frozen) return;
    const t = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(t);
  }, [state, frozen]);

  return (
    <Phone tab="log">
      <ConnectionBanner state={sessionLost ? 'signed-out' : connection} />
      <h1>What did you do?</h1>

      <label className="field-label" htmlFor="entry-text">Activity</label>
      <input
        id="entry-text" className="text" autoFocus enterKeyHint="done" placeholder="e.g. Email triage"
        value={text} readOnly={saving} aria-invalid={!!textError} aria-describedby={textError ? 'text-error' : undefined}
        onChange={(e) => edit(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void save()}
      />
      {textError && <p id="text-error" className="error" role="alert">{fieldMessage[textError]}</p>}

      <RecentChips texts={recent} onPick={edit} disabled={saving} />

      <div className="times">
        <TimeChip
          label="From" value={hhmm(from, timeZone)} disabled={saving} describedBy="time-error"
          invalid={timeError === 'entry_end_not_after_start'}
          onChange={(v) => setFromEdit(withTime(from, v, timeZone))}
        />
        <TimeChip
          label="To" value={hhmm(to, timeZone)} disabled={saving} describedBy="time-error"
          invalid={timeError === 'entry_end_in_future'}
          hint={toEdit === null ? 'now' : undefined}
          onReset={toEdit === null ? undefined : () => setToEdit(null)}
          onChange={(v) => setToEdit(withTime(to, v, timeZone))}
        />
      </div>
      {timeError && <p id="time-error" className="error" role="alert">{fieldMessage[timeError]}</p>}

      <OverlapNote with={overlapLabel} />

      <button className="primary" onClick={() => void save()} disabled={saving || !text.trim() || !!timeError}>
        {saving ? 'Saving…' : 'Save'}
      </button>

      <SaveStatus state={state} />

      {text && !saving && (
        <div className="row-actions"><button className="link" onClick={() => edit('')}>Clear</button></div>
      )}
    </Phone>
  );
}

// ---- live wiring: Local copy in, Server writes out ----

/** The Log form wired to the Local copy and the Server. */
export function LogForm() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(() => navigator.onLine);

  const reload = useCallback(async () => {
    try {
      setEntries((await readLocalCopy()).entries);
    } catch {
      // Storage unavailable: the form still works without Recent chips and prefill.
    }
  }, []);
  useEffect(() => {
    let live = true;
    Promise.resolve()
      .then(() => readLocalCopy())
      .then((c) => live && setEntries(c.entries), () => {});
    const unsub = onCopyChanged(() => void reload());
    return () => { live = false; unsub(); };
  }, [reload]);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      clearInterval(tick);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const onSave = useCallback(async (entry: NewEntry) => {
    const r = await writes.createEntry(entry); // refreshes the Local copy after the Server confirms
    if (r.ok) await reload();
    return r;
  }, [reload]);

  return (
    <LogFormView
      entries={entries} timeZone={deviceZone()} now={now}
      connection={online ? 'online' : 'offline'} onSave={onSave}
    />
  );
}
