import type React from 'react';
import { Link, useInRouterContext } from 'react-router';

export type Tab = 'log' | 'week' | 'settings';

/** Simple stroke icons (24x24, currentColor) so they follow the active/inactive colour. */
const icons: Record<Tab, React.ReactNode> = {
  log: <path d="M12 5v14M5 12h14" />,
  week: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>,
};

const tabs: { id: Tab; label: string; to: string }[] = [
  { id: 'log', label: 'Log', to: '/' },
  { id: 'week', label: 'This week', to: '/week' },
  { id: 'settings', label: 'Settings', to: '/settings' },
];

function Icon({ tab }: { tab: Tab }) {
  return (
    <svg className="tab-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[tab]}</svg>
  );
}

/** Three destinations, one tap each. Targets are at least 44 pt tall. Plain anchors outside a Router (Storybook). */
export function TabBar({ current }: { current: Tab }) {
  const inRouter = useInRouterContext();
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map(({ id, label, to }) => {
        const aria = current === id ? ('page' as const) : undefined;
        return inRouter
          ? <Link key={id} className="tab" aria-current={aria} to={to}><Icon tab={id} /><span>{label}</span></Link>
          : <a key={id} className="tab" aria-current={aria} href={to}><Icon tab={id} /><span>{label}</span></a>;
      })}
    </nav>
  );
}
