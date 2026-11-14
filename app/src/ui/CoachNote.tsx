import { useState } from 'react';
import type { CoachNoteRow } from '../data/db';
import type { Result } from '../data/request';

export const NOTE_MAX = 1200;

/**
 * Settings → What the coach remembers (#80): the AI's note about me, which it rewrites each week.
 * I can edit it (my lines are kept word for word) or clear it. Needs a connection.
 */
export function CoachNoteSection({ note, online, onSave, updatedLabel }: {
  note: Pick<CoachNoteRow, 'body' | 'source'> | null;
  online: boolean;
  onSave: (body: string) => Promise<Result<unknown>>;
  /** when the note last changed, already formatted */
  updatedLabel?: string | null;
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'clear'>('view');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const body = note?.body ?? '';
  const save = async (text: string) => {
    if (!online) { setProblem('Needs a connection.'); return; }
    setBusy(true);
    setProblem('');
    const r = await onSave(text);
    setBusy(false);
    if (r.ok) { setMode('view'); return; }
    setProblem(r.error === 'note_too_long' ? `Keep it to ${NOTE_MAX} characters.` : r.error === 'unknown' ? 'Needs a connection.' : "Couldn't save. Try again.");
  };

  return (
    <section className="panel" aria-labelledby="coach-h">
      <h2 id="coach-h">What the coach remembers</h2>
      {mode === 'edit' ? (
        <>
          <label>
            <span className="field-hint">The coach keeps your lines word for word.</span>
            <textarea className="text" rows={6} maxLength={NOTE_MAX} value={draft} onChange={(e) => setDraft(e.target.value)} />
          </label>
          <div className="coach-actions">
            <button className="primary small" onClick={() => void save(draft)} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button className="secondary" onClick={() => { setMode('view'); setProblem(''); }} disabled={busy}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          {body
            ? <p className="coach-note">{body}</p>
            : <p className="note">Nothing yet. After your first weekly insights, the coach writes what it learns about you here.</p>}
          {body && updatedLabel && <p className="note">{note?.source === 'me' ? 'Edited by you' : 'Written by the coach'} · {updatedLabel}</p>}
          {mode === 'clear' ? (
            <div className="coach-actions">
              <span>Clear the note?</span>
              <button className="secondary" onClick={() => void save('')} disabled={busy}>{busy ? 'Clearing…' : 'Clear'}</button>
              <button className="link" onClick={() => setMode('view')} disabled={busy}>Cancel</button>
            </div>
          ) : (
            <div className="coach-actions">
              <button className="secondary" onClick={() => { setDraft(body); setMode('edit'); setProblem(''); }} disabled={!online}>Edit</button>
              {body && <button className="link" onClick={() => setMode('clear')} disabled={!online}>Clear</button>}
            </div>
          )}
          {!online && <p className="note">Changing it needs a connection.</p>}
        </>
      )}
      {problem && <p className="error" role="alert">{problem}</p>}
    </section>
  );
}
