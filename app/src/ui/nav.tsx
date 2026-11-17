import { useCallback } from 'react';
import {
  Link as RouterLink, Navigate as RouterNavigate, useNavigate as useRouterNavigate,
  type LinkProps, type NavigateOptions, type NavigateProps, type To,
} from 'react-router';

/*
 * The app's navigation: every move replaces the history entry unless it opts out with `replace: false`.
 * In the Android home-screen app the back button walks history, so a pushed entry is one more press before
 * back leaves the app. Push only for a drill-down that back should return from (Week → a day).
 * Lint forbids react-router's own Link, NavLink, Navigate and useNavigate outside this file.
 */

/** react-router's Link, replacing the history entry unless `replace={false}`. */
export function Link({ replace = true, ...props }: LinkProps) {
  return <RouterLink replace={replace} {...props} />;
}

/** react-router's Navigate, replacing the history entry unless `replace={false}`. */
export function Navigate({ replace = true, ...props }: NavigateProps) {
  return <RouterNavigate replace={replace} {...props} />;
}

/** react-router's useNavigate, replacing the history entry unless `{ replace: false }`. */
export function useNavigate() {
  const navigate = useRouterNavigate();
  return useCallback((to: To, options?: NavigateOptions) => navigate(to, { replace: true, ...options }), [navigate]);
}
