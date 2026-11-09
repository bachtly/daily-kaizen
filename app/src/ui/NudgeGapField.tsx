import { Skeleton } from './Skeleton';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Nudge gap: remind me after N whole hours without a log, 1 to 12 (AC-6.1). A select, so no other value can be typed. */
export function NudgeGapField({ hours, loading, error, disabled, onChange }: {
  hours: number; loading?: boolean; error?: string; disabled?: boolean; onChange: (v: number) => void;
}) {
  return (
    <>
      <label className="field-label" htmlFor="nudge-gap">Remind me after</label>
      {loading ? <Skeleton height={44} radius={12} /> : (
        <select
          id="nudge-gap" className="text" value={hours} disabled={disabled}
          aria-invalid={!!error || undefined} aria-describedby={error ? 'nudge-error' : undefined}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {HOURS.map((h) => <option key={h} value={h}>{h === 1 ? '1 hour' : `${h} hours`} without a log</option>)}
        </select>
      )}
      {error && <p id="nudge-error" className="error" role="alert">{error}</p>}
    </>
  );
}
