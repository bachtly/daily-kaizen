import { useEffect, useState } from 'react';
import type { EntryRow } from '../data/db';
import { fetchWeek, refresh, type LocalCopy } from '../data/localCopy';
import type { Result } from '../data/request';
import { mondayOf, weekBounds } from '../data/week';
import { liveWindow } from './liveWrites';

export type WeekLoad = 'ready' | 'loading' | 'offline-earlier-week' | 'session-lost-earlier-week';

export const shiftMonday = (monday: string, days: number) => {
  const [y, m, d] = monday.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

// A refusal that means "your view is stale": refresh the Local copy too.
const STALE = ['entry_not_found', 'category_not_active', 'category_already_decided'];

/**
 * The Entries of one week for a screen: from the Local copy for this and the previous week, fetched (not stored) for earlier
 * ones. `afterWrite` reads the right source again after a write; the session-lost flag outlives moving to another week.
 */
export function useWeekEntries({ monday, now, tz, copy, copyReady, reload }: {
  monday: string; now: number; tz: string; copy: LocalCopy; copyReady: boolean; reload: () => Promise<void>;
}) {
  const [fetched, setFetched] = useState<{ monday: string; entries: EntryRow[] } | null>(null);
  // The failure belongs to one week: navigating away leaves it behind.
  const [failure, setFailure] = useState<{ monday: string; kind: 'offline' | 'session-lost' } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sessionLost, setSessionLost] = useState(false);

  const currentMonday = mondayOf(now, tz);
  const inLocalCopy = monday >= shiftMonday(currentMonday, -7);

  useEffect(() => {
    if (inLocalCopy) return;
    const ctl = new AbortController();
    const b = weekBounds(monday, tz);
    void fetchWeek({ start: new Date(b.start).toISOString(), end: new Date(b.end).toISOString() }).then((r) => {
      if (ctl.signal.aborted) return;
      if (r.ok) { setFetched({ monday, entries: r.data }); setFailure(null); setSessionLost(false); }
      else {
        setFailure({ monday, kind: r.error === 'session_lost' ? 'session-lost' : 'offline' });
        if (r.error === 'session_lost') setSessionLost(true); // stays up when moving to another week
      }
    });
    return () => ctl.abort();
  }, [inLocalCopy, monday, tz, attempt]);

  const bounds = weekBounds(monday, tz);
  const fail = failure?.monday === monday ? failure : null;
  const haveEarlier = !inLocalCopy && fetched?.monday === monday;
  const entries = inLocalCopy
    ? copy.entries.filter((e) => Date.parse(e.started_at) < bounds.end && Date.parse(e.ended_at) > bounds.start)
    : haveEarlier ? fetched.entries : [];
  const load: WeekLoad =
    !copyReady ? 'loading'
    : inLocalCopy || haveEarlier ? 'ready'
    : fail?.kind === 'offline' ? 'offline-earlier-week'
    : fail?.kind === 'session-lost' ? 'session-lost-earlier-week' : 'loading';

  /** After a write: a confirmed one already refreshed the Local copy; a stale refusal refreshes it here. */
  const afterWrite = async (r: Result<unknown>) => {
    if (!r.ok && STALE.includes(r.error)) await refresh(liveWindow(Date.now(), tz));
    if (r.ok || STALE.includes(r.error)) {
      await reload();
      if (!inLocalCopy) setAttempt((a) => a + 1); // an earlier week is read again with the same GET
    }
    if (r.ok) setSessionLost(false);
    else if (r.error === 'session_lost') setSessionLost(true);
    return r;
  };

  return {
    entries, load, inLocalCopy, currentMonday, sessionLost, setSessionLost, afterWrite,
    retry: () => { setFailure(null); setAttempt((a) => a + 1); },
  };
}
