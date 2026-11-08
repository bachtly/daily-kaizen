import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

let session: object | null = { user: {} }
vi.mock('./data/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}))
const onOpen = vi.fn()
vi.mock('./data/localCopy', () => ({ onOpen }))
const { routes, refreshWindow, refreshAfterSignIn } = await import('./routes')

beforeEach(() => {
  session = { user: {} }
  onOpen.mockReset()
})
afterEach(cleanup)

const at = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

test.each([
  ['/', 'Log'],
  ['/week', 'This week'],
  ['/week/2026-11-02', 'This week'],
  ['/settings', 'Settings'],
])('%s renders with the tab bar and marks the current tab', async (path, tab) => {
  at(path)
  const nav = await screen.findByRole('navigation', { name: 'Main' })
  expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe(tab)
})

test.each(['/', '/week', '/week/2026-11-02', '/settings'])('%s without a session goes to /sign-in', async (path) => {
  session = null
  const router = at(path)
  await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
  expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull()
})

test('/sign-in renders without a tab bar', () => {
  session = null
  at('/sign-in')
  expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull()
  expect(screen.getByLabelText('Email')).toBeTruthy()
})

test('tab bar links point to the three destinations', async () => {
  at('/')
  await screen.findByRole('navigation', { name: 'Main' })
  const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
  expect(links).toEqual(['/', '/week', '/settings'])
})

test('refresh window starts at the previous Monday 00:00 in the zone', () => {
  // Wed 2026-11-04 12:00 UTC, Tokyo: Monday 2026-11-02, previous 2026-10-26
  const w = refreshWindow(Date.UTC(2026, 10, 4, 12), 'Asia/Tokyo')
  expect(w).toEqual({ since: '2026-10-25T15:00:00.000Z', sinceDate: '2026-10-26' })
})

test('signing in refreshes the Local copy with the device time zone', () => {
  refreshAfterSignIn()
  expect(onOpen).toHaveBeenCalledOnce()
  const [win, tz] = onOpen.mock.calls[0]
  expect(tz).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  expect(win.sinceDate).toMatch(/^\d{4}-\d\d-\d\d$/)
})

test('the /sign-in route hands the refresh to SignInScreen', () => {
  const route = routes.find((r) => r.path === '/sign-in')
  const element = route?.element as { props: { onSignedIn?: () => void } }
  expect(element.props.onSignedIn).toBe(refreshAfterSignIn)
})
