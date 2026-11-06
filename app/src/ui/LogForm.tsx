import { useEffect, useState } from 'react';
import { ConnectionBanner, Phone, type Connection } from './Phone';
import { recentTexts } from './mock';

export type SaveOutcome = 'ok' | 'no-connection' | 'server-error' | 'end-in-future';

export type LogFormProps = {
  connection?: Connection;
  /** Prefilled start: latest end time in the Local copy, or 00:00 when there are no Entries (AC-1.1). */
  start?: string;
  now?: string;
  text?: string;
  /** End time the user picked; empty means "now" and it follows the clock. */
  end?: string;
  recent?: string[];
  overlapWith?: string;
  /** What the mock Server answers when Save is tapped. */
  saveOutcome?: SaveOutcome;
  /** Freeze the form in a state for review. */
  frozen?: 'saving' | 'saved';
};

/** Log form: the screen the app opens on. Only the text is required; times are prefilled. */
export function LogForm({
  connection = 'online', start = '09:40', now = '10:52', text = '', end = '',
  recent = recentTexts, overlapWith, saveOutcome = 'ok', frozen,
}: LogFormProps) {
  const [value, setValue] = useState(text);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | SaveOutcome>(frozen ?? 'idle');
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);

  useEffect(() => setValue(text), [text]);
  useEffect(() => setFrom(start), [start]);
  useEffect(() => setTo(end), [end]);

  const toValue = to || now;
  const timeError =
    status === 'end-in-future' || toValue > now ? "To can't be later than now."
    : from >= toValue ? 'From must be before To.'
    : undefined;

  const saving = status === 'saving';
  const save = () => {
    if (!value.trim()) return;
    setStatus('saving');
    setTimeout(() => {
      if (saveOutcome === 'ok') {
        setStatus('saved');
        setValue(''); setFrom(toValue > start ? toValue : start); setTo(''); // AC-1.1: latest end
        setTimeout(() => setStatus('idle'), 2000);
      } else setStatus(saveOutcome);
    }, 700);
  };

  return (
    <Phone tab="log">
      <ConnectionBanner state={connection} />
      <h1>What did you do?</h1>

      <label className="field-label" htmlFor="entry-text">Activity</label>
      <input
        id="entry-text" className="text" autoFocus enterKeyHint="done" placeholder="e.g. Email triage"
        value={value} readOnly={saving} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />

      {recent.length > 0 && (
        <div className="chips" aria-label="Recent">
          {recent.map((r) => (
            <button key={r} className="chip" onClick={() => setValue(r)} disabled={saving}>{r}</button>
          ))}
        </div>
      )}

      <div className="times">
        <TimeChip label="From" value={from} onChange={setFrom} disabled={saving} invalid={!!timeError && !timeError.startsWith('To')} />
        <TimeChip
          label="To" value={toValue} onChange={setTo} disabled={saving} invalid={!!timeError?.startsWith('To')}
          hint={to ? undefined : 'now'} onReset={to ? () => setTo('') : undefined}
        />
      </div>
      {timeError && <p className="error" role="alert">{timeError}</p>}

      {overlapWith && (
        <p className="note warn" role="status">Overlaps "{overlapWith}". It will still be saved.</p>
      )}

      <button className="primary" onClick={save} disabled={saving || !value.trim() || !!timeError}>
        {saving ? 'Saving…' : 'Save'}
      </button>

      <SaveStatus status={status} />

      {value && !saving && (
        <div className="row-actions"><button className="link" onClick={() => setValue('')}>Clear</button></div>
      )}

    </Phone>
  );
}

/**
 * Prefilled time. It is a native time input, so on iPhone a tap opens the iOS time wheel.
 * To shows "now" and follows the clock until changed; "Use now" puts it back.
 */
export function TimeChip({ label, value, onChange, hint, onReset, invalid, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  hint?: string; onReset?: () => void; invalid?: boolean; disabled?: boolean;
}) {
  const id = `time-${label.toLowerCase()}`;
  return (
    <div className="time">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        id={id} type="time" className="value" value={value} disabled={disabled} aria-invalid={invalid}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
      {hint && <span className="hint">{hint}</span>}
      {onReset && <button className="link hint" onClick={onReset}>Use now</button>}
    </div>
  );
}

/** Shows done only after the Server confirms (AC-2.1). */
function SaveStatus({ status }: { status: string }) {
  const text: Record<string, string> = {
    saved: 'Saved.',
    'no-connection': 'Needs a connection. Your text is kept. Tap Save again.',
    'server-error': "Couldn't save. Try again.",
  };
  const isError = status === 'no-connection' || status === 'server-error';
  return <p className={isError ? 'error' : 'status'} aria-live="polite">{text[status] ?? ''}</p>;
}
