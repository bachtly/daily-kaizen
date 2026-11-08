import { useState } from 'react';
import type { CategoryRow } from '../data/db';
import type { Result } from '../data/request';

/**
 * A Suggested category to approve or reject (AC-4.2, AC-4.3). Approving moves the Entries that suggested it, except those I tagged myself.
 * `category_not_active` and `category_already_decided` mean someone already decided: the caller refreshes and the card goes away, silently.
 */
export function SuggestedCategoryCard({ category, moveCount, online, onApprove, onReject }: {
  category: Pick<CategoryRow, 'name' | 'description'>;
  moveCount: number;
  online: boolean;
  onApprove: () => Promise<Result<unknown>>;
  onReject: () => Promise<Result<unknown>>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  const decide = async (call: () => Promise<Result<unknown>>) => {
    if (busy) return;
    if (!online) { setMessage('Needs a connection.'); return; }
    setBusy(true);
    setMessage(undefined);
    const r = await call();
    setBusy(false);
    if (r.ok || r.error === 'category_not_active' || r.error === 'category_already_decided' || r.error === 'session_lost') return;
    setMessage(r.error === 'unknown' ? 'Needs a connection.' : "Couldn't save. Try again.");
  };

  return (
    <div className="card" role="group" aria-label="Suggested category">
      <div className="title">Suggested category: {category.name}</div>
      <div className="desc">"{category.description}"</div>
      <div className="desc">{moveCount} {moveCount === 1 ? 'Entry' : 'Entries'} would move.</div>
      <div className="row-actions">
        <button className="secondary" onClick={() => void decide(onApprove)} disabled={busy}>Approve</button>
        <button className="secondary" onClick={() => void decide(onReject)} disabled={busy}>Reject</button>
      </div>
      {message && <p className="error" role="alert">{message}</p>}
    </div>
  );
}
