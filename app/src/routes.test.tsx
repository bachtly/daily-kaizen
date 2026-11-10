import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
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
const openPush = vi.fn()
vi.mock('./data/push', () => ({ openPush, browserEnv: () => ({}) }))
vi.mock('./ui/liveWrites', () => ({ writes: { upsertPushSubscription: () => {} }, deviceZone: () => 'UTC' }))
const { routes, refreshWindow } = await import('./routes')

beforeEach(() => {
  session = { user: {} }
  onOpen.mockReset().mockResolvedValue(undefined)
  openPush.mockReset().mockResolvedValue({ state: 'off' })
})
afterEach(cleanup)

const at = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

test.each([
  ['/', 'Day'],
  ['/day/2026-11-02', 'Day'],
  ['/week', 'Week'],
  ['/week/2026-11-02', 'Week'],
  ['/settings', 'Settings'],
])('%s renders with the tab bar and marks the current tab', async (path, tab) => {
  at(path)
  const nav = await screen.findByRole('navigation', { name: 'Main' })
  expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe(tab)
})

test.each(['/', '/day/2026-11-02', '/week', '/week/2026-11-02', '/settings'])('%s without a session goes to /sign-in', async (path) => {
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

test('a cold open with a session refreshes the Local copy and re-sends the Push subscription', async () => {
  at('/')
  await screen.findByRole('navigation', { name: 'Main' })
  await waitFor(() => expect(onOpen).toHaveBeenCalledOnce())
  const [win, tz] = onOpen.mock.calls[0]
  expect(tz).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  expect(win.sinceDate).toMatch(/^\d{4}-\d\d-\d\d$/)
  expect(openPush).toHaveBeenCalledOnce()
})

test('changing tabs does not refresh again', async () => {
  const router = at('/')
  await screen.findByRole('navigation', { name: 'Main' })
  await waitFor(() => expect(onOpen).toHaveBeenCalledOnce())
  await act(() => router.navigate('/settings'))
  expect(onOpen).toHaveBeenCalledOnce()
})

test('returning to the foreground refreshes; going to the background does not', async () => {
  at('/')
  await screen.findByRole('navigation', { name: 'Main' })
  await waitFor(() => expect(onOpen).toHaveBeenCalledOnce())
  const set = (v: string) => Object.defineProperty(document, 'visibilityState', { value: v, configurable: true })
  set('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  expect(onOpen).toHaveBeenCalledOnce()
  set('visible')
  document.dispatchEvent(new Event('visibilitychange'))
  expect(onOpen).toHaveBeenCalledTimes(2)
  expect(openPush).toHaveBeenCalledTimes(2)
})

test('without a session nothing is refreshed', async () => {
  session = null
  const router = at('/')
  await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
  expect(onOpen).not.toHaveBeenCalled()
  expect(openPush).not.toHaveBeenCalled()
})
