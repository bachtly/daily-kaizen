import type { PushState } from '../data/push';

/** Push on/off and what to do about it (AC-6.2). */
export function PushStatus({ state, online = true, busy, problem, onTurnOn }: {
  state: PushState;
  online?: boolean;
  busy?: boolean;
  problem?: string;
  onTurnOn?: () => void;
}) {
  if (state === 'not-installed') {
    return <p className="note">Add daily-kaizen to your Home Screen first: Share → Add to Home Screen. The Sunday email arrives either way.</p>;
  }
  if (state === 'denied') {
    return <p className="note">Push is off. Turn it on in iOS Settings → Notifications → daily-kaizen. The Sunday email still arrives.</p>;
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
