import type { PushState } from '../data/push';
import { Skeleton } from './Skeleton';

/** Push on/off and what to do about it (AC-6.2). */
export function PushStatus({ state, loading, online = true, busy, problem, onTurnOn }: {
  state: PushState;
  /** The browser and Server haven't answered yet: a Skeleton instead of any state. */
  loading?: boolean;
  online?: boolean;
  busy?: boolean;
  problem?: string;
  onTurnOn?: () => void;
}) {
  if (loading) return <><Skeleton height={24} width="40%" /><Skeleton height={44} radius={12} /></>;
  if (state === 'not-installed') {
    return (
      <>
        <p className="note">Push works from the Home Screen app. The Sunday email arrives either way.</p>
        <a className="secondary button-link" href="/install">Add to Home Screen</a>
      </>
    );
  }
  if (state === 'denied') {
    return <p className="note">Push is off. Allow notifications for daily-kaizen in your phone's Settings. The Sunday email still arrives.</p>;
  }
  return (
    <>
      <p>Push: <strong>{state === 'on' ? 'On' : 'Off'}</strong></p>
      {state === 'off' && (
        <button className="secondary" onClick={onTurnOn} disabled={busy || !online}>
          {busy ? 'Turning on…' : 'Turn on notifications'}
        </button>
      )}
      {state === 'off' && !online && <p className="note">Turning on needs a connection.</p>}
      {problem && <p className="error" role="alert">{problem}</p>}
      <p className="note">The Sunday email arrives either way.</p>
    </>
  );
}
