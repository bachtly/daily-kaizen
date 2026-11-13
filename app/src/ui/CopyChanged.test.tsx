import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { emitCopyChanged } from '../data/copyChanged'
import type { CategoryRow, EntryRow } from '../data/db'
import type { LocalCopy } from '../data/localCopy'

const readLocalCopy = vi.fn<() => Promise<LocalCopy>>()
vi.mock('../data/localCopy', () => ({ readLocalCopy, fetchWeek: vi.fn(), refresh: vi.fn() }))
vi.mock('./liveWrites', () => ({
  deviceZone: () => 'UTC',
  liveWindow: () => ({ since: '', sinceDate: '' }),
  writes: { reviewDone: vi.fn(), editEntry: vi.fn(), createEntry: vi.fn() },
}))
const { DayScreen } = await import('./DayScreen')
const { clearDrafts } = await import('./logDrafts')

const categories: CategoryRow[] = [{ id: 'deep', name: 'Deep', description: '', status: 'active' }]
const entry = (id: string, text: string): EntryRow => ({
  id, text, started_at: '2026-11-03T09:00:00Z', ended_at: '2026-11-03T10:00:00Z', created_at: '2026-11-03T10:00:00Z',
  time_zone: 'UTC', category_id: 'deep', tag_source: null, suggested_category_id: null, tagging_gave_up_at: null,
})
const copy = (entries: EntryRow[]): LocalCopy => ({ entries, categories, settings: null, reviews: [], refreshedAt: '2026-11-04T13:55:00Z' })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: Date.parse('2026-11-04T14:00:00Z') })
  readLocalCopy.mockReset().mockResolvedValue(copy([entry('a', 'Old entry')]))
})
afterEach(() => {
  cleanup()
  clearDrafts()
  vi.useRealTimers()
})

const day = () =>
  render(<MemoryRouter initialEntries={['/day/2026-11-03']}><Routes><Route path="/day/:date" element={<DayScreen />} /></Routes></MemoryRouter>)

it('a mounted Day screen shows new data after a refresh', async () => {
  day()
  await screen.findByText('Old entry')
  readLocalCopy.mockResolvedValue(copy([entry('a', 'Old entry'), entry('b', 'Fresh entry')]))
  await act(async () => emitCopyChanged())
  expect(await screen.findByText('Fresh entry')).toBeTruthy()
})

it('an open Log sheet shows new Recent chips after a refresh and keeps the typed text', async () => {
  day()
  await screen.findByText('Old entry')
  fireEvent.click(screen.getByLabelText('Log now'))
  fireEvent.change(screen.getByLabelText('What I did'), { target: { value: 'Half typed' } })
  readLocalCopy.mockResolvedValue(copy([entry('a', 'Old entry'), entry('b', 'Fresh entry')]))
  await act(async () => emitCopyChanged())
  expect(await screen.findByRole('button', { name: 'Fresh entry' })).toBeTruthy()
  expect((screen.getByLabelText('What I did') as HTMLInputElement).value).toBe('Half typed')
})
