import { useEffect, useRef, useState } from 'react';
import type { CategoryRow, EntryRow } from '../data/db';
import type { Result } from '../data/request';
import { categoryColour } from './weekFormat';

/**
 * Sheet to change an Entry's Tag. Active Categories only (AC-4.1). It traps focus, Escape closes it,
 * and focus returns to the Tag button that opened it.
 */
export function TagPicker({ entry, categories, online, onPick, onClose, returnFocusTo }: {
  entry: Pick<EntryRow, 'text' | 'category_id'>;
  categories: readonly CategoryRow[];
  online: boolean;
  onPick: (categoryId: string) => Promise<Result<unknown>>;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const active = categories.filter((c) => c.status === 'active');

  useEffect(() => {
    sheet.current?.querySelector<HTMLElement>('button')?.focus();
    return () => returnFocusTo?.focus();
  }, [returnFocusTo]);

  const keydown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;
    const items = [...(sheet.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const pick = async (id: string) => {
    if (busy) return;
    if (!online) { setMessage('Needs a connection.'); return; }
    setBusy(true);
    setMessage(undefined);
    const r = await onPick(id);
    setBusy(false);
    if (r.ok || r.error === 'entry_not_found' || r.error === 'session_lost') onClose();
    else setMessage(
      r.error === 'category_not_active' ? 'Pick another category.'
      : r.error === 'unknown' ? 'Needs a connection.' : "Couldn't save. Try again.",
    );
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={sheet} className="sheet" role="dialog" aria-modal="true" aria-label={`Category for ${entry.text}`}
        onClick={(e) => e.stopPropagation()} onKeyDown={keydown}
      >
        <strong>{entry.text}</strong>
        <ul>
          {active.map((c) => (
            <li key={c.id}>
              <button onClick={() => void pick(c.id)} disabled={busy}>
                <span className="dot" style={{ background: categoryColour(c.name) }} />
                {c.name}{c.id === entry.category_id ? ' ✓' : ''}
              </button>
            </li>
          ))}
        </ul>
        {message && <p className="error" role="alert">{message}</p>}
        <button className="secondary" onClick={onClose} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
}
