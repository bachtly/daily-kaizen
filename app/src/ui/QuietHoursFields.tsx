import { TimeChip } from './TimeChip';

/** Quiet hours: no Nudges between From and To; may wrap midnight (AC-6.3). Equal times are refused. */
export function QuietHoursFields({ start, end, error, disabled, onStart, onEnd }: {
  start: string; end: string; error?: string; disabled?: boolean;
  onStart: (v: string) => void; onEnd: (v: string) => void;
}) {
  return (
    <>
      <div className="times">
        <TimeChip label="From" value={start} onChange={onStart} invalid={!!error} disabled={disabled} describedBy="quiet-error" />
        <TimeChip label="To" value={end} onChange={onEnd} invalid={!!error} disabled={disabled} describedBy="quiet-error" />
      </div>
      {error && <p id="quiet-error" className="error" role="alert">{error}</p>}
    </>
  );
}
