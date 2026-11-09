import { Skeleton } from './Skeleton';
import { TimeChip } from './TimeChip';

/** Quiet hours: no Nudges between From and To; may wrap midnight (AC-6.3). Equal times are refused. */
export function QuietHoursFields({ start, end, error, disabled, loading, onStart, onEnd }: {
  loading?: boolean; start: string; end: string; error?: string; disabled?: boolean;
  onStart: (v: string) => void; onEnd: (v: string) => void;
}) {
  if (loading) {
    return (
      <div className="times">
        {['From', 'To'].map((l) => (
          <div className="time" key={l}><span className="field-label">{l}</span><Skeleton height={44} radius={12} /></div>
        ))}
      </div>
    );
  }
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
