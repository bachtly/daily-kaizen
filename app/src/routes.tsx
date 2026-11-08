import { createBrowserRouter, type RouteObject } from 'react-router';
import { onOpen, type RefreshWindow } from './data/localCopy';
import { mondayOf, weekBounds } from './data/week';
import { LogForm } from './ui/LogForm';
import { SettingsScreen } from './ui/SettingsScreen';
import { SignInScreen } from './ui/SignInScreen';
import { RequireSession } from './ui/useSession';
import { WeekScreen } from './ui/WeekScreen';

/** What the Local copy holds: from the previous Monday 00:00 (device time zone). */
export function refreshWindow(now: number, tz: string): RefreshWindow {
  const [y, m, d] = mondayOf(now, tz).split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 7)).toISOString().slice(0, 10);
  return { since: new Date(weekBounds(prev, tz).start).toISOString(), sinceDate: prev };
}

/** After sign-in: report the time zone and fill the Local copy. */
export function refreshAfterSignIn() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  void onOpen(refreshWindow(Date.now(), tz), tz);
}

const guarded = (element: React.ReactNode) => <RequireSession>{element}</RequireSession>;

// Screens render with mock data until the data layer lands.
export const routes: RouteObject[] = [
  { path: '/', element: guarded(<LogForm />) },
  { path: '/week', element: guarded(<WeekScreen />) },
  { path: '/week/:monday', element: guarded(<WeekScreen isCurrentWeek={false} />) },
  { path: '/settings', element: guarded(<SettingsScreen />) },
  { path: '/sign-in', element: <SignInScreen onSignedIn={refreshAfterSignIn} /> },
];

export const router = () => createBrowserRouter(routes);
