import { useId } from 'react';
import type { ActivityRow } from '../data/db';

/** Normalise as the Server does: trim and collapse spaces; empty means no Activity. */
export const activityKey = (name: string) => name.trim().replace(/\s+/g, ' ');

/**
 * Change an Entry's Activity: pick an Active one, type a new name, or choose None (AC-8.3).
 * The value is the name (empty = None); the parent saves it with the Entry.
 */
export function ActivityPicker({ value, activities, onChange, disabled, error }: {
  value: string; activities: readonly ActivityRow[]; onChange: (name: string) => void; disabled?: boolean;
  /** A message about the name, shown right under the field. */
  error?: string;
}) {
  const id = useId();
  const active = activities.filter((a) => a.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
  const current = activityKey(value).toLowerCase();
  return (
    <div className="activity-picker">
      <label className="field-label" htmlFor={id}>Activity</label>
      <input
        id={id} className="text" value={value} readOnly={disabled} placeholder="None" maxLength={60}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <p id={`${id}-error`} className="error" role="alert">{error}</p>}
      <div className="chips" role="group" aria-label="Pick an Activity">
        <button type="button" className="chip" aria-pressed={current === ''} disabled={disabled} onClick={() => onChange('')}>None</button>
        {active.map((a) => (
          <button
            key={a.id} type="button" className="chip" aria-pressed={current === a.name.toLowerCase()} disabled={disabled}
            onClick={() => onChange(a.name)}
          >{a.name}</button>
        ))}
      </div>
    </div>
  );
}
