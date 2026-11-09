import { Link, useInRouterContext } from 'react-router';

export type Connection = 'online' | 'offline' | 'signed-out';

/** Offline and session-lost states in one place (AC-2.2, AC-2.4). Texts per 05-ui States. */
export function ConnectionBanner({ state, refreshedAt }: { state: Connection; refreshedAt?: string | null }) {
  const inRouter = useInRouterContext();
  if (state === 'online') return null;
  return (
    <div className="banner" role="status" aria-live="polite">
      {state === 'offline'
        ? <>Offline. {refreshedAt ? `Showing data from ${refreshedAt}. ` : ''}Saving needs a connection.</>
        : <>Signed out. {inRouter ? <Link to="/sign-in">Sign in</Link> : <a href="/sign-in">Sign in</a>} to save.</>}
    </div>
  );
}
