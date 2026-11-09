import { useEffect, useState } from 'react';

import { browserEnv, openPush, turnOnPush, type PushState } from '../data/push';
import { getTimings, p95 } from '../data/timings';
import { deviceZone, writes } from './liveWrites';
import { PushStatus } from './PushStatus';
import { QuietHoursFields } from './QuietHoursFields';
import { ConnectionBanner, Phone, type Connection } from './Phone';
import { Skeleton } from './Skeleton';
import { useLocalCopy } from './useLocalCopy';
import { hhmm as clockTime } from './weekFormat';

export type { PushState };

export type SettingsViewProps = {
  connection?: Connection;
  push?: PushState;
  /** Parts still being read: each shows a Skeleton, never a default as if it were real. */
  loading?: { push?: boolean; hours?: boolean; speed?: boolean };
  /** Time of the last Local copy refresh, for the offline banner. */
  refreshedAt?: string | null;
  pushBusy?: boolean;
  pushProblem?: string;
  quietStart?: string;
  quietEnd?: string;
  /** The Server refused the hours (`quiet_hours_equal`). Equal fields are caught here too. */
  quietError?: boolean;
  saving?: boolean;
  saved?: boolean;
  /** Message under Save after a failed save. */
  saveProblem?: string;
  /** p95 of recent save and refresh durations in ms; null = no samples yet. */
  saveP95?: number | null;
  refreshP95?: number | null;
  onTurnOn?: () => void;
  onQuietStart?: (v: string) => void;
  onQuietEnd?: (v: string) => void;
  onSave?: () => void;
};

const EQUAL = 'Start and end must differ.';
const ms = (v: number | null | undefined) => (v == null ? '–' : `${v} ms`);

/** Settings: push on/off (AC-6.2) and Quiet hours (AC-6.3). */
export function SettingsView({
  connection = 'online', push = 'off', loading = {}, refreshedAt, pushBusy, pushProblem, quietStart = '23:00', quietEnd = '07:00', quietError,
  saving, saved, saveProblem, saveP95, refreshP95, onTurnOn, onQuietStart = () => {}, onQuietEnd = () => {}, onSave,
}: SettingsViewProps) {
  const online = connection !== 'offline';
  const error = quietError || quietStart === quietEnd ? EQUAL : undefined;
  return (
    <Phone tab="settings" busy={Object.values(loading).some(Boolean)}>
      <ConnectionBanner state={connection} refreshedAt={refreshedAt} />
      <h1>Settings</h1>

      <section className="panel" aria-labelledby="notif-h">
        <h2 id="notif-h">Notifications</h2>
        <PushStatus state={push} loading={loading.push} online={online} busy={pushBusy} problem={pushProblem} onTurnOn={onTurnOn} />
      </section>

      <section className="panel" aria-labelledby="quiet-h">
        <h2 id="quiet-h">Quiet hours (no Nudges)</h2>
        <QuietHoursFields loading={loading.hours} start={quietStart} end={quietEnd} error={error} disabled={saving} onStart={onQuietStart} onEnd={onQuietEnd} />
      </section>

      <button className="primary" onClick={onSave} disabled={saving || loading.hours || !!error || !online}>{saving ? 'Saving…' : 'Save'}</button>
      {!online && <p className="note">Saving needs a connection.</p>}
      {saveProblem && <p className="error" role="alert">{saveProblem}</p>}
      <p className="status" aria-live="polite">{saved ? 'Saved.' : ''}</p>

      {loading.speed
        ? <Skeleton height={36} />
        : <p className="note">Typical speed: save {ms(saveP95)} · refresh {ms(refreshP95)} (95th percentile of the last 50)</p>}
    </Phone>
  );
}

const hhmm = (t: string) => t.slice(0, 5);
const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const pushProblemText = (e?: string) =>
  e === 'unknown' ? 'Needs a connection.' : e === 'session_lost' ? undefined : e ? "Couldn't turn on. Try again." : undefined;

/** The Settings page wired to the Local copy, the Server and the browser's push. */
export function SettingsScreen() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [signedOut, setSignedOut] = useState(false);
  const { copy, ready } = useLocalCopy();
  const [push, setPush] = useState<PushState>();
  const [pushBusy, setPushBusy] = useState(false);
  const [pushProblem, setPushProblem] = useState<string>();
  // The fields show what the Local copy says; once edited, the edit wins and a later refresh doesn't overwrite it.
  const [startEdit, setStartEdit] = useState<string>();
  const [endEdit, setEndEdit] = useState<string>();
  const start = startEdit ?? (copy.settings ? hhmm(copy.settings.quiet_start) : '23:00');
  const end = endEdit ?? (copy.settings ? hhmm(copy.settings.quiet_end) : '07:00');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveProblem, setSaveProblem] = useState<string>();
  const [serverRefused, setServerRefused] = useState(false);
  const [speed, setSpeed] = useState<{ save: number | null; refresh: number | null }>();

  const report = async (sub: Parameters<typeof writes.upsertPushSubscription>[0]) => {
    const r = await writes.upsertPushSubscription(sub);
    if (!r.ok && r.error === 'session_lost') setSignedOut(true);
    return r;
  };
  const loadSpeed = () =>
    Promise.all([getTimings('save'), getTimings('refresh')]).then(([s, r]) => setSpeed({ save: p95(s), refresh: p95(r) }), () => setSpeed({ save: null, refresh: null }));

  useEffect(() => {
    let live = true;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    void loadSpeed();
    // Opening the page sends the subscription again when permission is already granted.
    void openPush(browserEnv(), VAPID, report).then((o) => {
      if (!live) return;
      setPush(o.state); // an unsent subscription is not an error here: the next open sends it again
    });
    return () => {
      live = false;
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const turnOn = async () => {
    setPushBusy(true);
    setPushProblem(undefined);
    const o = await turnOnPush(browserEnv(), VAPID, report);
    setPushBusy(false);
    setPush(o.state);
    setPushProblem(pushProblemText(o.error));
  };
  const save = async () => {
    setSaving(true);
    setSaved(false);
    setSaveProblem(undefined);
    setServerRefused(false);
    const r = await writes.saveSettings({ quiet_start: start, quiet_end: end });
    setSaving(false);
    if (r.ok) { setSaved(true); setSignedOut(false); void loadSpeed(); return; }
    if (r.error === 'session_lost') setSignedOut(true);
    else if (r.error === 'quiet_hours_equal') setServerRefused(true);
    else setSaveProblem(r.error === 'unknown' ? 'Needs a connection.' : "Couldn't save. Try again.");
  };

  return (
    <SettingsView
      connection={signedOut ? 'signed-out' : online ? 'online' : 'offline'}
      push={push ?? 'off'} loading={{ push: !push, hours: !ready || !copy.settings, speed: !speed }}
      refreshedAt={copy.refreshedAt ? clockTime(Date.parse(copy.refreshedAt), deviceZone()) : null} pushBusy={pushBusy} pushProblem={pushProblem}
      quietStart={start} quietEnd={end} quietError={serverRefused} saving={saving} saved={saved} saveProblem={saveProblem}
      saveP95={speed?.save} refreshP95={speed?.refresh}
      onTurnOn={() => void turnOn()}
      onQuietStart={(v) => { setStartEdit(v); setSaved(false); setServerRefused(false); }}
      onQuietEnd={(v) => { setEndEdit(v); setSaved(false); setServerRefused(false); }}
      onSave={() => void save()}
    />
  );
}
