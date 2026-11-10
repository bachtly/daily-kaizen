import { useEffect, useMemo, useRef, useState } from 'react';
import { dateOf, dayBounds, lastSlot } from '../data/day';
import type { EntryRow } from '../data/db';
import { findOverlaps, prefill, recentTexts } from '../data/prefill';
import type { Result } from '../data/request';
import type { NewEntry } from '../data/writes';
import { ConnectionBanner, type Connection } from './ConnectionBanner';
import { drafts, newDraft, type Draft } from './logDrafts';
import { OverlapNote } from './OverlapNote';
import { RecentChips } from './RecentChips';
import { SaveStatus, type SaveState } from './SaveStatus';
import { TimeChip } from './TimeChip';
import { dayHint, formatDuration, hhmm, latestAt, shortDate, withTime } from './weekFormat';

type LogEntry = Pick<EntryRow, 'id' | 'text' | 'started_at' | 'ended_at' | 'created_at'>;

/** Log now (floating +) or Fill an Unlogged slot of `day` (`YYYY-MM-DD`). */
export type SheetMode = { kind: 'now' } | { kind: 'fill'; start: number; end: number; day: string };

export type LogSheetProps = {
  mode: SheetMode;
  /** Log now: the day it starts on (the day the Day view shows); today when left out. */
  day?: string;
  /** Entries known on the phone: the Local copy, plus a fetched earlier week. */
  entries: readonly LogEntry[];
  timeZone: string;
  /** Current time in ms; the live wrapper ticks it. */
  now: number;
  connection?: Connection;
  /** The Local copy hasn't been read yet: From and Recent show a Skeleton and Save waits. */
  loading?: boolean;
  /** Resolves when the Server answers; `unknown` means the result is not known and a resend is safe. */
  onSave: (entry: NewEntry) => Promise<Result<unknown>>;
  /** After a confirmed save. */
  onSaved: () => void;
  onClose: () => void;
  /** Focus goes back here on close. */
  returnFocusTo?: HTMLElement | null;
  /** Freeze the sheet in a state for review (stories). */
  frozen?: 'saving';
  initialText?: string;
  initialFrom?: number;
  initialTo?: number;
};

const fieldMessage = {
  entry_text_empty: 'Write what you did.',
  entry_end_not_after_start: 'From must be before To.',
  entry_end_in_future: "To can't be later than now.",
} as const;
type FieldKey = keyof typeof fieldMessage;

const keyOf = (m: SheetMode) => (m.kind === 'now' ? 'now' : `fill:${m.start}`);

/**
 * The Log sheet (05-ui D5): a full-screen sheet, so its fields and Save sit above the iOS keyboard. Only the text is required.
 * Any day can be picked. Times are prefilled: today by AC-1.1 (latest end → now); Fill with its slot; another day with that
 * day's latest Unlogged slot (AC-1.4). Today's To means its latest occurrence not after now (#49); on another day To is on
 * that day. From is always the latest such time before To, so an Entry can cross midnight.
 */
export function LogSheet({
  mode, day: startDay, entries, timeZone, now, connection = 'online', loading, onSave, onSaved, onClose, returnFocusTo, frozen,
  initialText, initialFrom, initialTo,
}: LogSheetProps) {
  const key = keyOf(mode);
  const [first] = useState<Draft>(() => drafts.get(key) ?? { ...newDraft(), text: initialText ?? '' });
  const draft = useRef<Draft>(first);
  const [text, setText] = useState(first.text);
  const [fromEdit, setFromEdit] = useState<number | null>(initialFrom ?? null);
  const [toEdit, setToEdit] = useState<number | null>(initialTo ?? null);
  const [state, setState] = useState<SaveState>(frozen ?? 'idle');
  const [fieldError, setFieldError] = useState<FieldKey>();
  const [sessionLost, setSessionLost] = useState(false);
  const saving = state === 'saving';
  const sheet = useRef<HTMLDivElement>(null);

  const today = dateOf(now, timeZone);
  const [day, setDay] = useState(() => (mode.kind === 'fill' ? mode.day : startDay && startDay < today ? startDay : today));
  const fill = mode.kind === 'fill' && mode.day === day ? mode : undefined;
  const isToday = day === today;
  const bounds = useMemo(() => dayBounds(day, timeZone), [day, timeZone]);
  const pre = useMemo(() => prefill(entries, now, timeZone), [entries, now, timeZone]);
  const slot = useMemo(() => (fill || isToday ? undefined : lastSlot(entries, bounds, now)), [fill, isToday, entries, bounds, now]);
  const live = !fill && isToday; // To follows the clock
  const from = fromEdit ?? (fill ? fill.start : isToday ? pre.start : slot ? slot.start : bounds.end - 30 * 60_000);
  const to = toEdit ?? (fill ? fill.end : isToday ? now : slot ? slot.end : bounds.end);
  const hintFor = (ms: number) =>
    ms === bounds.end ? 'midnight' : isToday ? dayHint(ms, now, timeZone) : dateOf(ms, timeZone) === day ? undefined : shortDate(ms, timeZone);
  const pickDay = (v: string) => {
    if (!v || v > today) return;
    setDay(v);
    setFromEdit(null);
    setToEdit(null);
    setFieldError(undefined);
  };

  const remember = (next: Draft) => {
    draft.current = next;
    if (next.text.trim()) drafts.set(key, next);
    else drafts.delete(key);
  };
  const edit = (next: string) => {
    // Clearing the text starts a fresh draft; typing keeps the id and the time the sheet opened (NFR-1).
    remember(next.trim() ? { ...draft.current, text: next } : newDraft());
    setText(next);
    setFieldError(undefined);
    if (state !== 'saving' && !frozen) setState('idle');
  };

  const timeError: FieldKey | undefined = loading ? undefined :
    fieldError === 'entry_end_in_future' || to > now ? 'entry_end_in_future'
    : fieldError === 'entry_end_not_after_start' || from >= to ? 'entry_end_not_after_start'
    : undefined;
  const textError = fieldError === 'entry_text_empty' ? fieldError : undefined;

  const overlap = useMemo(() => (from < to ? findOverlaps(entries, from, to)[0] : undefined), [entries, from, to]);
  const overlapLabel =
    overlap && `${overlap.text} ${hhmm(Date.parse(overlap.started_at), timeZone)}–${hhmm(Date.parse(overlap.ended_at), timeZone)}`;
  const recent = useMemo(() => recentTexts(entries), [entries]);

  const save = async () => {
    if (saving || loading || frozen || !text.trim() || timeError) return;
    setState('saving');
    setFieldError(undefined);
    const r = await onSave({
      id: draft.current.id,
      form_opened_at: draft.current.openedAt,
      text: text.trim(),
      started_at: new Date(from).toISOString(),
      ended_at: new Date(to).toISOString(),
      time_zone: timeZone,
    });
    if (r.ok) {
      remember(newDraft());
      setText('');
      setState('idle');
      onSaved();
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

  // Log now shown again with empty text (app foregrounded): a fresh draft with new prefill.
  const textRef = useRef(text);
  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || textRef.current.trim() || key !== 'now') return;
      draft.current = newDraft();
      drafts.delete(key);
      setFromEdit(null);
      setToEdit(null);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [key]);

  useEffect(() => () => returnFocusTo?.focus(), [returnFocusTo]);

  const keydown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;
    const items = [...(sheet.current?.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)') ?? [])];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const title = fill ? 'Fill the gap' : 'What did you do?';
  return (
    <div className="sheet-backdrop full">
      <div
        ref={sheet} className="sheet log-sheet" role="dialog" aria-modal="true" aria-labelledby="log-sheet-title"
        aria-busy={loading || undefined} onKeyDown={keydown}
      >
        <div className="sheet-head">
          <h2 id="log-sheet-title" className="sheet-title">{title}</h2>
          <button className="link" onClick={onClose} disabled={saving}>Close</button>
        </div>
        <ConnectionBanner state={sessionLost ? 'signed-out' : connection} />
        {fill && (
          <p className="sheet-sub">
            {shortDate(dayBounds(fill.day, timeZone).start, timeZone, true)} · {hhmm(fill.start, timeZone)}–{hhmm(fill.end, timeZone)} ·{' '}
            {formatDuration(fill.end - fill.start)} unlogged
          </p>
        )}

        <label className="field-label" htmlFor="entry-text">Activity</label>
        <input
          id="entry-text" className="text" autoFocus enterKeyHint="done" placeholder="e.g. Email triage"
          value={text} readOnly={saving} aria-invalid={!!textError} aria-describedby={textError ? 'text-error' : undefined}
          onChange={(e) => edit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void save()}
        />
        {textError && <p id="text-error" className="error" role="alert">{fieldMessage[textError]}</p>}

        <RecentChips loading={loading} texts={recent} onPick={edit} disabled={saving} />

        <div className="time day-field">
          <label className="field-label" htmlFor="entry-day">Day</label>
          <input
            id="entry-day" type="date" className="value" value={day} max={today} disabled={saving} required
            onChange={(e) => pickDay(e.target.value)}
          />
          <span className="hint">{isToday ? 'today' : shortDate(bounds.start, timeZone, true)}</span>
        </div>

        <div className="times">
          <TimeChip
            label="From" loading={loading && live} value={hhmm(from, timeZone)} disabled={saving} describedBy="time-error"
            invalid={timeError === 'entry_end_not_after_start'}
            hint={hintFor(from)}
            onChange={(v) => setFromEdit(latestAt(to, v, timeZone, true))}
          />
          <TimeChip
            label="To" value={hhmm(to, timeZone)} disabled={saving} describedBy="time-error"
            invalid={timeError === 'entry_end_in_future'}
            hint={live && toEdit === null ? 'now' : hintFor(to)}
            onReset={!live || toEdit === null ? undefined : () => setToEdit(null)}
            onChange={(v) => setToEdit(live ? latestAt(now, v, timeZone) : withTime(bounds.start, v, timeZone))}
          />
        </div>
        {timeError && <p id="time-error" className="error" role="alert">{fieldMessage[timeError]}</p>}

        <OverlapNote with={overlapLabel} />

        <button className="primary" onClick={() => void save()} disabled={saving || loading || !text.trim() || !!timeError}>
          {saving ? 'Saving…' : 'Save'}
        </button>

        <SaveStatus state={state} />

        {text && !saving && (
          <div className="row-actions"><button className="link" onClick={() => edit('')}>Clear</button></div>
        )}
      </div>
    </div>
  );
}
