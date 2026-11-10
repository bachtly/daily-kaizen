import { useEffect, useState } from 'react';
import { LogFab } from './LogFab';
import { LogSheet } from './LogSheet';
import { deviceZone, writes } from './liveWrites';
import { useLocalCopy } from './useLocalCopy';

/**
 * The floating + and its Log now sheet for screens other than Day (Week, Settings), wired to the Local copy and the Server.
 * Returns the two pieces a screen hands to `Phone`: `fab` and `sheet` (its overlay).
 */
export function useLogNow() {
  const { copy, ready } = useLocalCopy();
  const [open, setOpen] = useState<HTMLElement | null | false>(false);
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    if (open === false) return;
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      clearInterval(tick);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [open]);

  const fab = <LogFab onOpen={(opener) => { setNow(Date.now()); setOpen(opener); }} />;
  const sheet = open === false ? undefined : (
    <LogSheet
      mode={{ kind: 'now' }} entries={copy.entries} timeZone={deviceZone()} now={now} loading={!ready}
      connection={online ? 'online' : 'offline'} returnFocusTo={open}
      onSave={(entry) => writes.createEntry(entry)} // refreshes the Local copy after the Server confirms
      onSaved={() => setOpen(false)} onClose={() => setOpen(false)}
    />
  );
  return { fab, sheet };
}
