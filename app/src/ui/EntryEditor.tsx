import { useMemo, useState } from 'react';
import type { EntryRow } from '../data/db';
import { findOverlaps } from '../data/prefill';
import type { Result } from '../data/request';
import type { EntryFields } from '../data/writes';
import { OverlapNote } from './OverlapNote';
import { TimeChip } from './TimeChip';
import { hhmm, withTime } from './weekFormat';

const messages = {
  entry_text_empty: 'Write what you did.',
  entry_end_not_after_start: 'From must be before To.',
  entry_end_in_future: "To can't be later than now.",
  entry_not_found: 'This Entry was deleted.',
  time_zone_unknown: "Couldn't save. Try again.",
} as const;
type Known = keyof typeof messages;

/**
 * Inline editor: the row expands in place, one at a time (AC-1.3). Save and Delete need a connection (D3).
 * The AC-1.2 checks apply; an overlap only warns. No form-open time is sent for an edit.
 * Changing the text re-tags the Entry unless its Tag source is me (the Server clears the Tag).
 */
export function EntryEditor({ entry, siblings, now, online, onSave, onDelete, onClose }: {
  entry: EntryRow;
  /** Other Entries of the week, for the overlap warning. */
  siblings: readonly EntryRow[];
  now: number;
  online: boolean;
  onSave: (fields: EntryFields) => Promise<Result<unknown>>;
  onDelete: () => Promise<Result<unknown>>;
  /** Called after a confirmed save or delete, and on Cancel. */
  onClose: () => void;
}) {
  const tz = entry.time_zone;
  const [text, setText] = useState(entry.text);
  const [from, setFrom] = useState(Date.parse(entry.started_at));
  const [to, setTo] = useState(Date.parse(entry.ended_at));
  const [busy, setBusy] = useState<'saving' | 'deleting' | null>(null);
  const [problem, setProblem] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const timeError =
    to > now ? messages.entry_end_in_future
    : from >= to ? messages.entry_end_not_after_start
    : undefined;
  const textError = !text.trim() ? messages.entry_text_empty : undefined;
  const overlap = useMemo(() => (from < to ? findOverlaps(siblings, from, to, entry.id)[0] : undefined), [siblings, from, to, entry.id]);
  const overlapLabel = overlap && `${overlap.text} ${hhmm(Date.parse(overlap.started_at), tz)}–${hhmm(Date.parse(overlap.ended_at), tz)}`;

  const explain = (error: string) =>
    error === 'unknown' ? 'Needs a connection.' : error in messages ? messages[error as Known] : "Couldn't save. Try again.";

  const run = async (kind: 'saving' | 'deleting', call: () => Promise<Result<unknown>>) => {
    setBusy(kind);
    setProblem(undefined);
    const r = await call();
    setBusy(null);
    if (r.ok) onClose();
    else if (r.error !== 'session_lost') setProblem(explain(r.error)); // session lost: the banner says it and the edit stays
  };
  const save = () =>
    run('saving', () => onSave({ text: text.trim(), started_at: new Date(from).toISOString(), ended_at: new Date(to).toISOString(), time_zone: tz }));

  const disabled = busy !== null;
  return (
    <div className="entry-edit" role="group" aria-label={`Edit ${entry.text}`}>
      <label className="field-label" htmlFor={`edit-text-${entry.id}`}>Activity</label>
      <input
        id={`edit-text-${entry.id}`} className="text" autoFocus value={text} readOnly={disabled}
        aria-invalid={!!textError} aria-describedby={textError ? `edit-text-error-${entry.id}` : undefined}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !textError && !timeError && online && !disabled && void save()}
      />
      {textError && <p id={`edit-text-error-${entry.id}`} className="error" role="alert">{textError}</p>}
      <div className="times">
        <TimeChip
          label="From" value={hhmm(from, tz)} disabled={disabled} invalid={!!timeError && from >= to}
          describedBy={`edit-time-error-${entry.id}`} onChange={(v) => setFrom(withTime(from, v, tz))}
        />
        <TimeChip
          label="To" value={hhmm(to, tz)} disabled={disabled} invalid={!!timeError}
          describedBy={`edit-time-error-${entry.id}`} onChange={(v) => setTo(withTime(to, v, tz))}
        />
      </div>
      {timeError && <p id={`edit-time-error-${entry.id}`} className="error" role="alert">{timeError}</p>}
      <OverlapNote with={overlapLabel} />
      {!online && <p className="note">Saving needs a connection.</p>}
      {problem && <p className="error" role="alert">{problem}</p>}
      <div className="row-actions">
        <button className="primary small" onClick={() => void save()} disabled={disabled || !!textError || !!timeError || !online}>
          {busy === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button className="secondary" onClick={onClose} disabled={disabled}>Cancel</button>
        {confirmDelete ? (
          <span>
            Delete?{' '}
            <button className="link danger" onClick={() => void run('deleting', onDelete)} disabled={disabled || !online}>Yes</button>{' '}
            <button className="link" onClick={() => setConfirmDelete(false)} disabled={disabled}>No</button>
          </span>
        ) : (
          <button className="link danger" onClick={() => setConfirmDelete(true)} disabled={disabled || !online}>Delete</button>
        )}
      </div>
    </div>
  );
}
