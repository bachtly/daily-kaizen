import { useId, useState } from 'react';
import type { ActivityRow } from '../data/db';

/** Normalise as the Server does: trim and collapse spaces; empty means no Activity. */
export const activityKey = (name: string) => name.trim().replace(/\s+/g, ' ');
/** An Entry has at most this many Activities (#79). */
export const MAX_ACTIVITIES = 3;

/** Same list as the Server would store: normalised, no repeats (case-insensitive), no blanks. */
export const activityList = (names: readonly string[]) => {
  const seen = new Set<string>();
  return names.map(activityKey).filter((n) => n && !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()));
};

/**
 * Change an Entry's Activities: remove one with ×, add up to 3 by picking an Active one or typing a new name (#79).
 * The value is the list of names; the parent saves it with the Entry.
 */
export function ActivityPicker({ value, activities, onChange, disabled, error }: {
  value: readonly string[]; activities: readonly ActivityRow[]; onChange: (names: string[]) => void; disabled?: boolean;
  /** A message about a name, shown right under the field. */
  error?: string;
}) {
  const id = useId();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const taken = new Set(value.map((n) => n.toLowerCase()));
  const offered = activities
    .filter((a) => a.status === 'active' && !taken.has(a.name.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const full = value.length >= MAX_ACTIVITIES;
  const add = (name: string) => {
    onChange(activityList([...value, name]).slice(0, MAX_ACTIVITIES));
    setDraft('');
    setAdding(false);
  };
  return (
    <div className="activity-picker" role="group" aria-label="Activities">
      <span className="field-label">Activities (up to {MAX_ACTIVITIES})</span>
      <div className="chips">
        {value.map((n) => (
          <button
            key={n} type="button" className="chip selected" disabled={disabled} aria-label={`Remove ${n}`}
            onClick={() => onChange(value.filter((v) => v !== n))}
          >{n} ×</button>
        ))}
        {!full && !adding && (
          <button type="button" className="chip add" disabled={disabled} onClick={() => setAdding(true)}>+ Add</button>
        )}
      </div>
      {adding && !full && (
        <div className="activity-add">
          <label className="field-label" htmlFor={id}>Activity name</label>
          <input
            id={id} className="text" autoFocus value={draft} readOnly={disabled} maxLength={60}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && activityKey(draft)) { e.preventDefault(); add(draft); } }}
          />
          <div className="chips" role="group" aria-label="Pick an Activity">
            {offered.map((a) => (
              <button key={a.id} type="button" className="chip" disabled={disabled} onClick={() => add(a.name)}>{a.name}</button>
            ))}
          </div>
          <div className="row-actions">
            <button type="button" className="secondary" disabled={disabled || !activityKey(draft)} onClick={() => add(draft)}>Add</button>
            <button type="button" className="link" disabled={disabled} onClick={() => { setAdding(false); setDraft(''); }}>Cancel</button>
          </div>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
