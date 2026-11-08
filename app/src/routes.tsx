import { createBrowserRouter, type RouteObject } from 'react-router';
import { LogForm } from './ui/LogForm';
import { SettingsScreen } from './ui/SettingsScreen';
import { SignInScreen } from './ui/SignInScreen';
import { WeekScreen } from './ui/WeekScreen';

// Screens render with mock data until the data layer lands.
export const routes: RouteObject[] = [
  { path: '/', element: <LogForm /> },
  { path: '/week', element: <WeekScreen /> },
  { path: '/week/:monday', element: <WeekScreen isCurrentWeek={false} /> },
  { path: '/settings', element: <SettingsScreen /> },
  { path: '/sign-in', element: <SignInScreen /> },
];

export const router = () => createBrowserRouter(routes);
