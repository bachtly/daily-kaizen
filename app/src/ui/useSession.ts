import { createElement, useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { supabase } from '../data/supabase';

export type SessionState = 'loading' | 'signed-in' | 'signed-out';

/** The stored Supabase session: loading until it is read, then signed in or out. */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>('loading');
  useEffect(() => {
    let live = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (live) setState(data.session ? 'signed-in' : 'signed-out');
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? 'signed-in' : 'signed-out');
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return state;
}

/** Wrap a route element: no session on open → /sign-in. Shows nothing while the session is read. */
export function RequireSession({ children }: { children: ReactNode }) {
  const state = useSession();
  if (state === 'loading') return null;
  if (state === 'signed-out') return createElement(Navigate, { to: '/sign-in', replace: true });
  return children;
}
