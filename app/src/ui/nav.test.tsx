import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type NavigateOptions } from 'react-router';
import { afterEach, expect, it } from 'vitest';
import { Link, Navigate, useNavigate } from './nav';

afterEach(cleanup);

let go: (to: string, options?: NavigateOptions) => void = () => {};
function Probe() {
  go = useNavigate();
  return <><Link to="/b">replace</Link><Link to="/b" replace={false}>push</Link></>;
}
const start = () => {
  const router = createMemoryRouter(
    [{ path: '/a', element: <Probe /> }, { path: '/b', element: <p>b</p> }, { path: '/old', element: <Navigate to="/b" /> }],
    { initialEntries: ['/a'] },
  );
  render(<RouterProvider router={router} />);
  return router;
};

it('Link replaces the history entry by default', async () => {
  const router = start();
  fireEvent.click(screen.getByText('replace'));
  await screen.findByText('b');
  expect(router.state.historyAction).toBe('REPLACE');
});

it('Link pushes with replace={false}', async () => {
  const router = start();
  fireEvent.click(screen.getByText('push'));
  await screen.findByText('b');
  expect(router.state.historyAction).toBe('PUSH');
});

it('useNavigate replaces by default and pushes with { replace: false }', async () => {
  const router = start();
  await act(async () => go('/b'));
  expect(router.state.historyAction).toBe('REPLACE');
  await act(() => router.navigate('/a'));
  await act(async () => go('/b', { replace: false }));
  expect(router.state.historyAction).toBe('PUSH');
});

it('Navigate replaces by default', async () => {
  const router = start();
  await act(() => router.navigate('/old'));
  await screen.findByText('b');
  expect(router.state.location.pathname).toBe('/b');
  expect(router.state.historyAction).toBe('REPLACE');
});
