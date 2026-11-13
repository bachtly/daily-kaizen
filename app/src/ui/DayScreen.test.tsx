import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CategoryRow, EntryRow } from '../data/db';
import type { LocalCopy } from '../data/localCopy';
import type { Result } from '../data/request';
import type { NewEntry } from '../data/writes';

const readLocalCopy = vi.fn<() => Promise<LocalCopy>>();
const fetchWeek = vi.fn<(r: { start: string; end: string }) => Promise<Result<EntryRow[]>>>();
const createEntry = vi.fn<(e: NewEntry) => Promise<Result<unknown>>>();
const editEntry = vi.fn<(id: string, f: unknown) => Promise<Result<unknown>>>();
const refresh = vi.fn(async () => ({ ok: true }));
vi.mock('../data/localCopy', () => ({ readLocalCopy, fetchWeek, refresh }));
vi.mock('./liveWrites', () => ({ deviceZone: () => 'UTC', liveWindow: () => ({ since: '', sinceDate: '' }), writes: { createEntry, editEntry } }));
const { DayScreen } = await import('./DayScreen');
const { clearDrafts } = await import('./logDrafts');

const categories: CategoryRow[] = [{ id: 'deep', name: 'Deep', description: '', status: 'active' }];
const entry = (id: string, day: string, from: string, to: string): EntryRow => ({
  id, text: `Entry ${id}`, started_at: `2026-11-${day}T${from}:00Z`, ended_at: `2026-11-${day}T${to}:00Z`,
  created_at: `2026-11-${day}T${to}:00Z`, time_zone: 'UTC', category_id: 'deep', tag_source: null,
  suggested_category_id: null, tagging_gave_up_at: null,
});
const NOW = Date.parse('2026-11-04T14:00:00Z'); // Wednesday; Monday is 2026-11-02
const entries = [entry('a', '04', '07:00', '08:00'), entry('b', '04', '09:30', '10:00'), entry('c', '02', '18:00', '19:00')];
const copy = (over: Partial<LocalCopy> = {}): LocalCopy => ({
  entries, categories, settings: null, reviews: [], refreshedAt: '2026-11-04T13:55:00Z', ...over,
});

function Where() {
  const l = useLocation();
  return <output data-testid="where">{l.pathname}{l.search}</output>;
}
const mount = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<><DayScreen /><Where /></>} />
        <Route path="/day/:date" element={<><DayScreen /><Where /></>} />
      </Routes>
    </MemoryRouter>,
  );
const where = () => screen.getByTestId('where').textContent;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  readLocalCopy.mockReset();
  fetchWeek.mockReset();
  createEntry.mockReset();
  editEntry.mockReset();
  refresh.mockClear();
});
afterEach(() => { cleanup(); clearDrafts(); vi.useRealTimers(); });

describe('DayScreen', () => {
  it('hides the + while a sheet is open, and on a past day + starts on that day', async () => {
    readLocalCopy.mockResolvedValue(copy());
    mount('/day/2026-11-02');
    fireEvent.click(await screen.findByLabelText('Log now'));
    expect(screen.queryByLabelText('Log now')).toBeNull();
    expect((screen.getByLabelText('Day') as HTMLInputElement).value).toBe('2026-11-02');
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('19:00');
    fireEvent.click(screen.getByText('Close'));
    expect(screen.getByLabelText('Log now')).toBeTruthy();
  });

  it('slides the + away while scrolling down and brings it back on scroll up', async () => {
    readLocalCopy.mockResolvedValue(copy());
    mount('/');
    await screen.findByText('Today');
    const body = document.querySelector('main') as HTMLElement;
    const dock = () => (document.querySelector('.fab-dock') as HTMLElement).className;
    body.scrollTop = 200;
    fireEvent.scroll(body);
    expect(dock()).toContain('away');
    body.scrollTop = 100;
    fireEvent.scroll(body);
    expect(dock()).not.toContain('away');
  });

  it("opens on today with its Entries, Unlogged slots and the time logged (AC-1.4)", async () => {
    readLocalCopy.mockResolvedValue(copy());
    mount('/');
    await screen.findByText('Today');
    expect(screen.getByText('Logged 1h 30m')).toBeTruthy();
    const list = screen.getByLabelText('Entries on Wed 4 Nov');
    expect(within(list).getByText('1h 30m unlogged')).toBeTruthy(); // 08:00–09:30
    expect(within(list).getByText('4h 00m unlogged')).toBeTruthy(); // 10:00–now
    expect(within(list).queryByText(/Entry c/)).toBeNull();
  });

  it('fills a slot: the sheet opens with its times, saves, closes and says Saved.', async () => {
    readLocalCopy.mockResolvedValue(copy());
    createEntry.mockResolvedValue({ ok: true, data: null });
    mount('/');
    fireEvent.click(await screen.findByLabelText('Fill 08:00–09:30'));
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('08:00');
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('09:30');
    fireEvent.change(screen.getByLabelText('What I did'), { target: { value: 'Commute' } });
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Saved.');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(createEntry.mock.calls[0][0]).toMatchObject({ text: 'Commute', started_at: '2026-11-04T08:00:00.000Z', ended_at: '2026-11-04T09:30:00.000Z' });
    expect(readLocalCopy.mock.calls.length).toBeGreaterThan(1);
  });

  it('opens Log now from the floating +, and from a Nudge (?log=now) once', async () => {
    readLocalCopy.mockResolvedValue(copy());
    mount('/?log=now');
    expect((await screen.findByRole('dialog')).textContent).toContain('What did you do?');
    await waitFor(() => expect(where()).toBe('/'));
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByLabelText('Log now'));
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('14:00');
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('10:00');
  });

  it('picks another day from the strip, and goes back with Today', async () => {
    readLocalCopy.mockResolvedValue(copy());
    mount('/');
    fireEvent.click(await screen.findByRole('button', { name: /^Mon\s*2\s*Nov, 1h 00m logged$/ }));
    await waitFor(() => expect(where()).toBe('/day/2026-11-02'));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Mon 2 Nov');
    expect(screen.getByText('Entry c')).toBeTruthy();
    expect((screen.getByRole('button', { name: /^Thu\s*5\s*Nov$/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Today'));
    await waitFor(() => expect(where()).toBe('/'));
  });

  it('fetches a day older than the Local copy; offline shows Retry, which fetches again', async () => {
    readLocalCopy.mockResolvedValue(copy());
    fetchWeek.mockResolvedValueOnce({ ok: false, error: 'unknown' });
    mount('/day/2026-10-07');
    await screen.findByText('Earlier days need a connection.');
    fetchWeek.mockResolvedValueOnce({ ok: true, data: [] });
    fireEvent.click(screen.getByText('Retry'));
    await screen.findByText('Nothing logged');
    expect(fetchWeek.mock.calls[0][0].start).toBe('2026-10-05T00:00:00.000Z');
  });

  it('refreshes the Local copy when an edit says the Entry is gone', async () => {
    readLocalCopy.mockResolvedValueOnce(copy());
    // After the refresh the Entry is really gone, so its editor unmounts.
    readLocalCopy.mockResolvedValue(copy({ entries: entries.filter((e) => e.id !== 'a') }));
    editEntry.mockResolvedValue({ ok: false, error: 'entry_not_found' });
    mount('/');
    fireEvent.click(await screen.findByLabelText(/^Edit Entry a,/));
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('This Entry was deleted.');
    expect(screen.queryByLabelText(/^Edit Entry a,/)).toBeNull();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('reads an earlier week again after a confirmed write', async () => {
    readLocalCopy.mockResolvedValue(copy());
    fetchWeek.mockResolvedValue({ ok: true, data: [entry('x', '02', '09:00', '10:00')].map((e) => ({ ...e, started_at: '2026-10-06T09:00:00Z', ended_at: '2026-10-06T10:00:00Z' })) });
    editEntry.mockResolvedValue({ ok: true, data: null });
    mount('/day/2026-10-06');
    fireEvent.click(await screen.findByLabelText(/^Edit Entry x,/));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(fetchWeek).toHaveBeenCalledTimes(2));
  });
});
