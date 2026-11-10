import { useEffect } from 'react';
import { createBrowserRouter, Outlet, type RouteObject } from 'react-router';
import { onOpen, type RefreshWindow } from './data/localCopy';
import { browserEnv, openPush } from './data/push';
import { mondayOf, weekBounds } from './data/week';
import { DayScreen } from './ui/DayScreen';
import { SettingsScreen } from './ui/SettingsScreen';
import { SignInScreen } from './ui/SignInScreen';
import { writes } from './ui/liveWrites';
import { RequireSession } from './ui/useSession';
import { WeekScreen } from './ui/WeekScreen';

/** What the Local copy holds: from the previous Monday 00:00 (device time zone). */
export function refreshWindow(now: number, tz: string): RefreshWindow {
  const [y, m, d] = mondayOf(now, tz).split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 7)).toISOString().slice(0, 10);
  return { since: new Date(weekBounds(prev, tz).start).toISOString(), sinceDate: prev };
}

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/** App open or return to foreground, with a session: report the time zone, refresh the Local copy, re-send the Push subscription (AC-2.3, AC-6.2). */
export function refreshOnOpen() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  void onOpen(refreshWindow(Date.now(), tz), tz).catch(() => {});
  void openPush(browserEnv(), VAPID, writes.upsertPushSubscription).catch(() => {});
}

/** Runs the open refresh when the signed-in app mounts and each time it comes back to the foreground. */
export function OnOpen() {
  useEffect(() => {
    refreshOnOpen();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshOnOpen();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  return <Outlet />;
}

// All screens but /sign-in need a session, and share one OnOpen (tab changes do not refresh again). The screens still show mock data until their ui-* tasks wire them to the Local copy.
export const routes: RouteObject[] = [
  {
    element: (
      <RequireSession>
        <OnOpen />
      </RequireSession>
    ),
    children: [
      { path: '/', element: <DayScreen /> },
      { path: '/day/:date', element: <DayScreen /> },
      { path: '/week', element: <WeekScreen /> },
      { path: '/week/:monday', element: <WeekScreen isCurrentWeek={false} /> },
      { path: '/settings', element: <SettingsScreen /> },
    ],
  },
  { path: '/sign-in', element: <SignInScreen /> },
];

export const router = () => createBrowserRouter(routes);
