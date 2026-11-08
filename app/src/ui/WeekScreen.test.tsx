import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CategoryRow, EntryRow } from '../data/db';
import type { LocalCopy } from '../data/localCopy';
import type { Result } from '../data/request';

const readLocalCopy = vi.fn<() => Promise<LocalCopy>>();
const fetchWeek = vi.fn<(r: { start: string; end: string }) => Promise<Result<EntryRow[]>>>();
const reviewDone = vi.fn<(monday: string) => Promise<Result<unknown>>>();
const editEntry = vi.fn<(id: string, f: unknown) => Promise<Result<unknown>>>();
const refresh = vi.fn(async () => ({ ok: true }));
vi.mock('../data/localCopy', () => ({ readLocalCopy, fetchWeek, refresh }));
vi.mock('./liveWrites', () => ({ deviceZone: () => 'UTC', liveWindow: () => ({ since: '', sinceDate: '' }), writes: { reviewDone, editEntry } }));
const { WeekScreen, WeekView } = await import('./WeekScreen');

const categories: CategoryRow[] = [
  { id: 'deep', name: 'Deep', description: '', status: 'active' },
  { id: 'shallow', name: 'Shallow', description: '', status: 'active' },
];
const entry = (id: string, day: string, from: string, to: string, category: string | null): EntryRow => ({
  id, text: `Entry ${id}`, started_at: `2026-11-${day}T${from}:00Z`, ended_at: `2026-11-${day}T${to}:00Z`,
  created_at: `2026-11-${day}T${to}:00Z`, time_zone: 'UTC', category_id: category, tag_source: null,
  suggested_category_id: null, tagging_gave_up_at: null,
});
const NOW = Date.parse('2026-11-04T14:00:00Z'); // Wednesday; Monday is 2026-11-02
const entries = [entry('a', '02', '09:00', '11:00', 'deep'), entry('b', '03', '09:00', '10:30', null)];

const view = (props: Partial<React.ComponentProps<typeof WeekView>> = {}) =>
  render(
    <MemoryRouter>
      <WeekView
        monday="2026-11-02" timeZone="UTC" now={NOW} isCurrentWeek entries={entries} categories={categories}
        reviewDone={false} refreshedAt="2026-11-04T13:55:00Z" onReviewDone={async () => ({ ok: true, data: null })} {...props}
      />
    </MemoryRouter>,
  );
const row = (label: string) =>
  within(document.querySelector('.totals') as HTMLElement).getByText(label).closest('li') as HTMLElement;

beforeEach(() => {
  vi.useRealTimers();
  readLocalCopy.mockReset();
  fetchWeek.mockReset();
  reviewDone.mockReset();
  editEntry.mockReset();
  refresh.mockClear();
});
afterEach(cleanup);

describe('WeekView', () => {
  it('shows time per Category, Untagged and Unlogged from the week (AC-5.1)', () => {
    view();
    expect(within(row('Deep')).getByText('2h 00m')).toBeTruthy();
    expect(within(row('Shallow')).getByText('0h 00m')).toBeTruthy();
    expect(within(row('Untagged')).getByText('1h 30m')).toBeTruthy();
    // Mon 00:00 to Wed 14:00 = 62 h, minus 3 h 30 m logged
    expect(within(row('Unlogged')).getByText('58h 30m')).toBeTruthy();
    expect(row('Unlogged').className).toBe('neutral');
  });

  it('shows only Unlogged when nothing is logged', () => {
    view({ entries: [] });
    expect(document.querySelector('.totals')?.textContent).not.toContain('Deep');
    expect(row('Unlogged')).toBeTruthy();
    expect(screen.getByText('Nothing logged this week yet.')).toBeTruthy();
  });

  it('shows RefreshedAt and the Review done badge (AC-2.4, AC-5.3)', () => {
    view({ reviewDone: true });
    expect(screen.getByText('Updated 13:55')).toBeTruthy();
    expect(screen.getByText('Review done ✓')).toBeTruthy();
    expect(screen.queryByText('Mark review done')).toBeNull();
  });

  it('hides the badge and button when the review state is unknown', () => {
    view({ reviewDone: undefined });
    expect(screen.queryByText('Not reviewed')).toBeNull();
    expect(screen.queryByText('Mark review done')).toBeNull();
  });

  it('says Needs a connection on tap when offline and does not call the Server', () => {
    const onReviewDone = vi.fn();
    view({ connection: 'offline', onReviewDone });
    fireEvent.click(screen.getByText('Mark review done'));
    expect(screen.getByText('Needs a connection.')).toBeTruthy();
    expect(onReviewDone).not.toHaveBeenCalled();
  });

  it('keeps the button and says so when the Server could not be reached', async () => {
    view({ onReviewDone: async () => ({ ok: false, error: 'unknown' }) });
    fireEvent.click(screen.getByText('Mark review done'));
    await screen.findByText('Needs a connection.');
    expect(screen.getByText('Mark review done')).toBeTruthy();
  });

  it('offers Retry for an earlier week that needs a connection', () => {
    const onRetry = vi.fn();
    view({ isCurrentWeek: false, load: 'offline-earlier-week', onRetry });
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByText('Earlier weeks need a connection.')).toBeTruthy();
  });
});

describe('WeekScreen', () => {
  const copy = (over: Partial<LocalCopy> = {}): LocalCopy => ({
    entries: [], categories, settings: null, reviews: [], refreshedAt: '2026-11-04T13:55:00Z', ...over,
  });
  const mount = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/week" element={<WeekScreen />} />
          <Route path="/week/:monday" element={<WeekScreen isCurrentWeek={false} />} />
        </Routes>
      </MemoryRouter>,
    );

  it('fetches an earlier week outside the Local copy, offline shows a message, Retry fetches again', async () => {
    readLocalCopy.mockResolvedValue(copy());
    fetchWeek.mockResolvedValueOnce({ ok: false, error: 'unknown' });
    mount('/week/2026-10-05');
    await screen.findByText('Earlier weeks need a connection.');
    fetchWeek.mockResolvedValueOnce({ ok: true, data: [entry('x', '02', '09:00', '10:00', 'deep')] });
    fireEvent.click(screen.getByText('Retry'));
    await screen.findByText('Time per category');
    expect(fetchWeek).toHaveBeenCalledTimes(2);
    expect(fetchWeek.mock.calls[0][0].start).toBe('2026-10-05T00:00:00.000Z');
    expect(readLocalCopy).toHaveBeenCalled();
  });

  it('drops the offline message when moving to another week', async () => {
    readLocalCopy.mockResolvedValue(copy());
    fetchWeek.mockResolvedValueOnce({ ok: false, error: 'unknown' });
    mount('/week/2026-10-05');
    await screen.findByText('Earlier weeks need a connection.');
    fetchWeek.mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByLabelText('Next week'));
    await waitFor(() => expect(screen.queryByText('Earlier weeks need a connection.')).toBeNull());
    expect(screen.getByText('Week of 12 Oct')).toBeTruthy();
  });

  it('shows the signed-out banner instead of a skeleton when the earlier-week fetch loses the session', async () => {
    readLocalCopy.mockResolvedValue(copy());
    fetchWeek.mockResolvedValueOnce({ ok: false, error: 'session_lost' });
    mount('/week/2026-10-05');
    await screen.findByText(/Signed out/);
    expect(document.querySelector('.skeleton')).toBeNull();
    expect(screen.getByText('Sign in to see earlier weeks.')).toBeTruthy();
  });

  it('refreshes the Local copy when an edit says the Entry is gone', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    readLocalCopy.mockResolvedValue(copy({ entries }));
    editEntry.mockResolvedValue({ ok: false, error: 'entry_not_found' });
    mount('/week');
    fireEvent.click(await screen.findByLabelText(/^Edit Entry a,/));
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('This Entry was deleted.');
    expect(refresh).toHaveBeenCalledOnce();
    expect(readLocalCopy.mock.calls.length).toBeGreaterThan(1);
  });

  it('reads an earlier week again after a confirmed write', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    readLocalCopy.mockResolvedValue(copy());
    fetchWeek.mockResolvedValue({ ok: true, data: [entry('x', '02', '09:00', '10:00', 'deep')] });
    editEntry.mockResolvedValue({ ok: true, data: null });
    mount('/week/2026-10-05');
    fireEvent.click(await screen.findByLabelText(/^Edit Entry x,/));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(fetchWeek).toHaveBeenCalledTimes(2));
  });

  it('keeps the signed-out banner when moving to another week while the session is still lost', async () => {
    readLocalCopy.mockResolvedValue(copy());
    fetchWeek.mockResolvedValueOnce({ ok: false, error: 'session_lost' });
    mount('/week/2026-10-05');
    await screen.findByText(/Signed out/);
    fetchWeek.mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByLabelText('Next week'));
    await screen.findByText('Week of 12 Oct');
    expect(screen.getByText(/Signed out/)).toBeTruthy();
    expect(screen.queryByText('Sign in to see earlier weeks.')).toBeNull();
  });

  it('marks the review done through the Server, then reads the Local copy again', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    readLocalCopy.mockResolvedValueOnce(copy({ entries }));
    reviewDone.mockResolvedValue({ ok: true, data: undefined });
    readLocalCopy.mockResolvedValue(copy({ entries, reviews: [{ week_start: '2026-11-02' }] }));
    mount('/week');
    fireEvent.click(await screen.findByText('Mark review done'));
    await waitFor(() => expect(reviewDone).toHaveBeenCalledWith('2026-11-02'));
    await screen.findByText('Review done ✓');
    expect(screen.queryByText('Mark review done')).toBeNull();
  });
});
