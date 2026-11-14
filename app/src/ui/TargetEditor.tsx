import { useState } from 'react';
import type { Result } from '../data/request';

const MIN_H = 0.5;
const MAX_H = 80;

const messageFor = (error: string) =>
  error === 'target_out_of_range' ? `Between ${MIN_H} and ${MAX_H} hours.`
  : error === 'unknown' ? 'Needs a connection.'
  : error === 'activity_not_found' ? 'That Activity is gone.'
  : error === 'category_not_found' ? 'That Category is gone.'
  : "Couldn't save. Try again.";

const hoursText = (ms: number | null) => (ms === null ? '' : String(Math.round((ms / 3_600_000) * 100) / 100));

/** Weekly target in hours, 0.5–80; empty clears it. `onSave` gets minutes, or null to clear. */
export function TargetEditor({ label, currentMs, online, onSave, onClose }: {
  label: string;
  currentMs: number | null;
  online: boolean;
  onSave: (minutes: number | null) => Promise<Result<unknown>>;
  onClose: () => void;
}) {
  const [text, setText] = useState(hoursText(currentMs));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  const submit = async () => {
    if (busy) return;
    if (!online) { setMessage('Needs a connection.'); return; }
    const raw = text.trim().replace(',', '.');
    let minutes: number | null = null;
    if (raw !== '') {
      const h = Number(raw);
      if (!Number.isFinite(h) || h < MIN_H || h > MAX_H) { setMessage(messageFor('target_out_of_range')); return; }
      minutes = Math.round(h * 60);
    }
    setBusy(true);
    setMessage(undefined);
    const r = await onSave(minutes);
    setBusy(false);
    if (r.ok) { onClose(); return; }
    if (r.error === 'session_lost') return; // the Signed out banner already says it
    setMessage(messageFor(r.error));
  };

  return (
    <form className="target-editor" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <label>
        <span className="field-hint">{label}: hours per week (empty clears)</span>
        <input
          className="text" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)}
          aria-invalid={message ? true : undefined} aria-describedby={message ? 'target-error' : undefined} placeholder="e.g. 15"
        />
      </label>
      {message && <p className="error" id="target-error" role="alert">{message}</p>}
      <div className="row-actions">
        <button className="secondary" type="submit" disabled={busy || !online}>Save</button>
        <button className="secondary" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
