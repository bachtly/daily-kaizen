import type { ReactNode } from 'react';

export type Tab = 'log' | 'week' | 'settings';
export type Connection = 'online' | 'offline' | 'signed-out';

/** iPhone-sized frame so mockups read at real scale. Not part of the real app. */
export function Phone({ children, tab, overlay }: { children: ReactNode; tab?: Tab; overlay?: ReactNode }) {
  return (
    <div className="phone" style={{ position: 'relative' }}>
      <div className="phone-status" />
      <main className="phone-body">{children}</main>
      {tab && <TabBar current={tab} />}
      <div className="phone-home" />
      {overlay}
    </div>
  );
}

/** Three destinations, one tap each. */
export function TabBar({ current }: { current: Tab }) {
  const tabs: [Tab, string][] = [['log', 'Log'], ['week', 'This week'], ['settings', 'Settings']];
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map(([id, label]) => (
        <button key={id} aria-current={current === id ? 'page' : undefined}>{label}</button>
      ))}
    </nav>
  );
}

/** Offline and signed-out states in one place (AC-2.2, AC-2.4). */
export function ConnectionBanner({ state, refreshedAt = '14:02' }: { state: Connection; refreshedAt?: string }) {
  if (state === 'online') return null;
  return (
    <div className="banner" role="status" aria-live="polite">
      {state === 'offline'
        ? <>Offline. Showing data from {refreshedAt}. Saving needs a connection.</>
        : <>Signed out. <button>Sign in</button> to save.</>}
    </div>
  );
}
