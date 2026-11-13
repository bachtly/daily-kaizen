import { useState } from 'react';
import type { Result } from '../data/request';

/**
 * "Mark review done" (AC-5.3) with an optional "one change for next week" note (#74, up to 140 characters).
 * Done shows only after the Server confirms; offline or a failure says so and keeps the button.
 */
export function ReviewDoneButton({ onMark, online }: { onMark: (note: string) => Promise<Result<unknown>>; online: boolean }) {
  const [state, setState] = useState<'idle' | 'saving' | 'needs-connection' | 'failed' | 'too-long'>('idle');
  const [note, setNote] = useState('');
  const tap = async () => {
    if (state === 'saving') return;
    if (!online) { setState('needs-connection'); return; }
    setState('saving');
    const r = await onMark(note.trim());
    if (r.ok) { setState('idle'); return; } // the badge appears when the Local copy is read again
    if (r.error === 'session_lost') { setState('idle'); return; } // the Signed out banner already says it
    setState(r.error === 'unknown' ? 'needs-connection' : r.error === 'next_change_too_long' ? 'too-long' : 'failed');
  };
  const message =
    state === 'needs-connection' ? 'Needs a connection.'
    : state === 'failed' ? "Couldn't save. Try again."
    : state === 'too-long' ? 'Keep it to 140 characters.'
    : '';
  return (
    <>
      <label className="review-note">
        <span className="note" style={{ marginTop: 0 }}>One change for next week (optional)</span>
        <input className="text" value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} disabled={!online} />
      </label>
      <button className="primary" onClick={() => void tap()} disabled={state === 'saving'}>
        {state === 'saving' ? 'Saving…' : 'Mark review done'}
      </button>
      <p className={message ? 'error' : 'status'} role="status" aria-live="polite">{message}</p>
    </>
  );
}
