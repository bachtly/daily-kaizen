import { ConnectionBanner, Phone, type Connection } from './Phone';

export type PushState = 'off' | 'on' | 'denied' | 'not-installed';

export type SettingsScreenProps = {
  connection?: Connection;
  push?: PushState;
  quietStart?: string;
  quietEnd?: string;
  quietError?: boolean;
  saved?: boolean;
};

/** Settings: push on/off (AC-6.2) and Quiet hours (AC-6.3). */
export function SettingsScreen({
  connection = 'online', push = 'off', quietStart = '23:00', quietEnd = '07:00', quietError, saved,
}: SettingsScreenProps) {
  return (
    <Phone tab="settings">
      <ConnectionBanner state={connection} />
      <h1>Settings</h1>

      <section className="panel" aria-labelledby="notif-h">
        <h2 id="notif-h">Notifications</h2>
        <PushStatus state={push} />
      </section>

      <section className="panel" aria-labelledby="quiet-h">
      <h2 id="quiet-h">Quiet hours (no Nudges)</h2>
      <div className="times">
        <div className="time"><label className="field-label">From</label><button className="value" aria-invalid={quietError}>{quietStart}</button></div>
        <div className="time"><label className="field-label">To</label><button className="value" aria-invalid={quietError}>{quietEnd}</button></div>
      </div>
      {quietError && <p className="error">Start and end must differ.</p>}
      </section>
      <button className="primary">Save</button>
      <p className="status" aria-live="polite">{saved ? 'Saved.' : ''}</p>
    </Phone>
  );
}

function PushStatus({ state }: { state: PushState }) {
  if (state === 'not-installed') {
    return <p className="note">Add daily-kaizen to your Home Screen first: Share → Add to Home Screen. The Sunday email arrives either way.</p>;
  }
  if (state === 'denied') {
    return <p className="note">Push is off. Turn it on in iOS Settings → Notifications → daily-kaizen. The Sunday email still arrives.</p>;
  }
  return (
    <>
      <p>Push: <strong>{state === 'on' ? 'On' : 'Off'}</strong></p>
      {state === 'off' && <button className="secondary">Turn on notifications</button>}
      <p className="note">The Sunday email arrives either way.</p>
    </>
  );
}
