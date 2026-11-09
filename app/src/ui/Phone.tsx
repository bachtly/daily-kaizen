import type { ReactNode } from 'react';

import { TabBar, type Tab } from './TabBar';
import type { Connection } from './ConnectionBanner';

export type { Tab, Connection };

/** iPhone-sized frame so mockups read at real scale. Not part of the real app. */
export function Phone({ children, tab, overlay, busy }: { children: ReactNode; tab?: Tab; overlay?: ReactNode; busy?: boolean }) {
  return (
    <div className="phone" style={{ position: 'relative' }}>
      <div className="phone-status" />
      {/* Focusable so a long screen can be scrolled from the keyboard. */}
      <main className="phone-body" tabIndex={0} aria-busy={busy || undefined}>{children}</main>
      {tab && <TabBar current={tab} />}
      <div className="phone-home" />
      {overlay}
    </div>
  );
}

export { TabBar } from './TabBar';
export { ConnectionBanner } from './ConnectionBanner';
