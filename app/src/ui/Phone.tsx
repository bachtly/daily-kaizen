import type { ReactNode } from 'react';

import { TabBar, type Tab } from './TabBar';
import type { Connection } from './ConnectionBanner';

export type { Tab, Connection };

/** iPhone-sized frame so mockups read at real scale. Not part of the real app. */
export function Phone({ children, tab, overlay, busy, fab }: {
  children: ReactNode; tab?: Tab; overlay?: ReactNode; busy?: boolean;
  /** The floating + (LogFab); the body gets room below so it never covers the last control. */
  fab?: ReactNode;
}) {
  return (
    <div className="phone" style={{ position: 'relative' }}>
      <div className="phone-status" />
      {/* Focusable so a long screen can be scrolled from the keyboard. */}
      <main className={fab ? 'phone-body with-fab' : 'phone-body'} tabIndex={0} aria-busy={busy || undefined}>{children}</main>
      {fab && <div className="fab-dock">{fab}</div>}
      {tab && <TabBar current={tab} />}
      <div className="phone-home" />
      {overlay}
    </div>
  );
}

export { TabBar } from './TabBar';
export { ConnectionBanner } from './ConnectionBanner';
