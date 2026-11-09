import { useState } from 'react';
import type { Result } from '../data/request';

/** "Mark review done" (AC-5.3). Done shows only after the Server confirms; offline or a failure says so and keeps the button. */
export function ReviewDoneButton({ onMark, online }: { onMark: () => Promise<Result<unknown>>; online: boolean }) {
  const [state, setState] = useState<'idle' | 'saving' | 'needs-connection' | 'failed'>('idle');
  const tap = async () => {
    if (state === 'saving') return;
    if (!online) { setState('needs-connection'); return; }
    setState('saving');
    const r = await onMark();
    if (r.ok) { setState('idle'); return; } // the badge appears when the Local copy is read again
    if (r.error === 'session_lost') { setState('idle'); return; } // the Signed out banner already says it
    setState(r.error === 'unknown' ? 'needs-connection' : 'failed');
  };
  return (
    <>
      <button className="primary" onClick={() => void tap()} disabled={state === 'saving'}>
        {state === 'saving' ? 'Saving…' : 'Mark review done'}
      </button>
      <p className={state === 'needs-connection' || state === 'failed' ? 'error' : 'status'} role="status" aria-live="polite">
        {state === 'needs-connection' ? 'Needs a connection.' : state === 'failed' ? "Couldn't save. Try again." : ''}
      </p>
    </>
  );
}
