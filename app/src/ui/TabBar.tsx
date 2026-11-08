import { Link, useInRouterContext } from 'react-router';

export type Tab = 'log' | 'week' | 'settings';

const tabs: { id: Tab; label: string; to: string }[] = [
  { id: 'log', label: 'Log', to: '/' },
  { id: 'week', label: 'This week', to: '/week' },
  { id: 'settings', label: 'Settings', to: '/settings' },
];

/** Three destinations, one tap each. Targets are at least 44 pt tall. Plain anchors outside a Router (Storybook). */
export function TabBar({ current }: { current: Tab }) {
  const inRouter = useInRouterContext();
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map(({ id, label, to }) => {
        const aria = current === id ? ('page' as const) : undefined;
        return inRouter
          ? <Link key={id} className="tab" aria-current={aria} to={to}>{label}</Link>
          : <a key={id} className="tab" aria-current={aria} href={to}>{label}</a>;
      })}
    </nav>
  );
}
