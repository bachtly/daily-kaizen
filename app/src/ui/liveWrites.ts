import { refresh } from '../data/localCopy';
import { recordTiming } from '../data/timings';
import { mondayOf, weekBounds } from '../data/week';
import { createWrites } from '../data/writes';

/** What the Local copy holds: from the previous Monday 00:00 (same window as routes.refreshWindow). */
export function liveWindow(now: number, tz: string) {
  const [y, m, d] = mondayOf(now, tz).split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 7)).toISOString().slice(0, 10);
  return { since: new Date(weekBounds(prev, tz).start).toISOString(), sinceDate: prev };
}

export const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Phone writes wired to the real Local copy refresh and save timings. Screens share this one instance. */
export const writes = createWrites({
  refresh: () => refresh(liveWindow(Date.now(), deviceZone())),
  recordTiming,
});
