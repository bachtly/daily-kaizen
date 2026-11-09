import { Skeleton } from './Skeleton';

/**
 * Prefilled time. It is a native time input, so on iPhone a tap opens the iOS time wheel.
 * To shows "now" and follows the clock until changed; "Use now" puts it back.
 */
export function TimeChip({ label, value, onChange, hint, onReset, invalid, disabled, describedBy, loading }: {
  /** The value isn't known yet: a Skeleton in the input's place. */
  loading?: boolean;
  label: string; value: string; onChange: (v: string) => void;
  hint?: string; onReset?: () => void; invalid?: boolean; disabled?: boolean; describedBy?: string;
}) {
  const id = `time-${label.toLowerCase()}`;
  return (
    <div className="time">
      <label className="field-label" htmlFor={id}>{label}</label>
      {loading ? <Skeleton height={44} radius={12} /> : <input
        id={id} type="time" className="value" value={value} disabled={disabled}
        aria-invalid={invalid} aria-describedby={invalid ? describedBy : undefined}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />}
      {hint && <span className="hint">{hint}</span>}
      {onReset && <button className="link hint" onClick={onReset} disabled={disabled}>Use now</button>}
    </div>
  );
}
