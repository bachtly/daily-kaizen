import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, test } from 'vitest'
import { routes } from './routes'

afterEach(cleanup)

const at = (path: string) => {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

test.each([
  ['/', 'Log'],
  ['/week', 'This week'],
  ['/week/2026-11-02', 'This week'],
  ['/settings', 'Settings'],
])('%s renders with the tab bar and marks the current tab', (path, tab) => {
  at(path)
  const nav = screen.getByRole('navigation', { name: 'Main' })
  expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe(tab)
})

test('/sign-in renders without a tab bar', () => {
  at('/sign-in')
  expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull()
  expect(screen.getByLabelText('Email')).toBeTruthy()
})

test('tab bar links point to the three destinations', () => {
  at('/')
  const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
  expect(links).toEqual(['/', '/week', '/settings'])
})
