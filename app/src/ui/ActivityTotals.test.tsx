import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activityTotals } from '../data/activities';
import type { ActivityRow, CategoryRow, EntryRow } from '../data/db';
import type { Result } from '../data/request';
import { ActivityTotals, type ActivityActions } from './ActivityTotals';

const categories: CategoryRow[] = [
  { id: 'deep', name: 'Deep', description: '', status: 'active' },
  { id: 'shallow', name: 'Shallow', description: '', status: 'active' },
];
const activities: ActivityRow[] = [
  { id: 'ca', name: 'Company A', status: 'active', merged_into_id: null },
  { id: 'gm', name: 'Game', status: 'active', merged_into_id: null },
  { id: 'old', name: 'Old name', status: 'merged', merged_into_id: 'ca' },
];
const entry = (id: string, from: string, to: string, category: string | null, activity: string | null): EntryRow => ({
  id, text: `Entry ${id}`, started_at: `2026-11-02T${from}:00Z`, ended_at: `2026-11-02T${to}:00Z`, created_at: `2026-11-02T${to}:00Z`,
  time_zone: 'UTC', category_id: category, tag_source: null, suggested_category_id: null, tagging_gave_up_at: null, activity_id: activity,
});
const bounds = { start: Date.parse('2026-11-02T00:00:00Z'), end: Date.parse('2026-11-09T00:00:00Z') };
const entries = [
  entry('a', '09:00', '11:00', 'deep', 'ca'),
  entry('c', '12:00', '13:00', 'shallow', 'ca'),
  entry('b', '14:00', '15:30', null, null),
];
const totals = activityTotals(entries, bounds);

const rename = vi.fn<(id: string, name: string) => Promise<Result<unknown>>>();
const merge = vi.fn<(from: string, into: string) => Promise<Result<unknown>>>();
const actions: ActivityActions = { renameActivity: rename, mergeActivity: merge };

const mount = (props: Partial<React.ComponentProps<typeof ActivityTotals>> = {}) =>
  render(<ActivityTotals totals={totals} activities={activities} categories={categories} online actions={actions} {...props} />);
const openCompanyA = () => fireEvent.click(screen.getByRole('button', { name: /^Company A/ }));

beforeEach(() => { rename.mockReset(); merge.mockReset(); });
afterEach(cleanup);

describe('ActivityTotals', () => {
  it('is hidden while there are no Activities', () => {
    mount({ activities: [] });
    expect(screen.queryByRole('heading', { name: 'Time per activity' })).toBeNull();
  });

  it('lists Activities largest first with (no Activity) last, and opens to the Category split', () => {
    mount();
    const rows = Array.from(document.querySelectorAll('.act-row'));
    expect(rows.map((r) => r.querySelector('.name')?.textContent)).toEqual(['Company A', '(no Activity)']);
    expect(within(rows[0] as HTMLElement).getByText('3h 00m')).toBeTruthy();
    expect(rows[0].getAttribute('aria-expanded')).toBe('false');
    openCompanyA();
    const split = document.querySelector('.act-split') as HTMLElement;
    expect(within(split).getByText('Deep').closest('li')?.textContent).toContain('2h 00m');
    expect(within(split).getByText('Shallow').closest('li')?.textContent).toContain('1h 00m');
    expect(screen.getByText('Rename')).toBeTruthy();
  });

  it('has no Rename or Merge on the (no Activity) row', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /^\(no Activity\)/ }));
    expect(screen.getByText('Untagged')).toBeTruthy();
    expect(screen.queryByText('Rename')).toBeNull();
  });

  it('renames through the Server and shows the name-taken message on a clash', async () => {
    rename.mockResolvedValueOnce({ ok: false, error: 'activity_name_taken' });
    mount();
    openCompanyA();
    fireEvent.click(screen.getByText('Rename'));
    fireEvent.change(screen.getByLabelText('Activity name'), { target: { value: 'Game' } });
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('You already have an Activity with that name.');
    expect(rename).toHaveBeenCalledWith('ca', 'Game');
    rename.mockResolvedValueOnce({ ok: true, data: null });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.queryByLabelText('Activity name')).toBeNull());
  });

  it('blocks a blank rename and caps the field at 60', () => {
    mount();
    openCompanyA();
    fireEvent.click(screen.getByText('Rename'));
    const input = screen.getByLabelText('Activity name');
    expect(input.getAttribute('maxlength')).toBe('60');
    fireEvent.change(input, { target: { value: '   ' } });
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(true);
    expect(rename).not.toHaveBeenCalled();
  });

  it.each([
    ['activity_name_blank', 'Write a name.'],
    ['activity_name_too_long', 'Use 60 characters or fewer.'],
  ] as const)('shows a message for %s', async (error, text) => {
    rename.mockResolvedValueOnce({ ok: false, error });
    mount();
    openCompanyA();
    fireEvent.click(screen.getByText('Rename'));
    fireEvent.change(screen.getByLabelText('Activity name'), { target: { value: 'Game' } });
    fireEvent.click(screen.getByText('Save'));
    const msg = await screen.findByText(text);
    expect(screen.getByLabelText('Activity name').getAttribute('aria-describedby')).toBe(msg.id);
    expect(msg.compareDocumentPosition(screen.getByText('Save')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // above Save
  });

  it('says why a blank name cannot be saved, under the field', () => {
    mount();
    openCompanyA();
    fireEvent.click(screen.getByText('Rename'));
    fireEvent.change(screen.getByLabelText('Activity name'), { target: { value: '' } });
    expect(screen.getByLabelText('Activity name').getAttribute('aria-describedby')).toBe(screen.getByText('Write a name.').id);
  });

  it('merges into a picked Active Activity, never a merged one or itself', async () => {
    merge.mockResolvedValueOnce({ ok: true, data: null });
    mount();
    openCompanyA();
    fireEvent.click(screen.getByText('Merge into…'));
    const picker = document.querySelector('.act-pick') as HTMLElement;
    expect(within(picker).getAllByRole('button').map((b) => b.textContent)).toEqual(['Game']);
    fireEvent.click(within(picker).getByText('Game'));
    await waitFor(() => expect(merge).toHaveBeenCalledWith('ca', 'gm'));
  });

  it('says the Activity is gone when it was merged elsewhere', async () => {
    merge.mockResolvedValueOnce({ ok: false, error: 'activity_not_found' });
    mount();
    openCompanyA();
    fireEvent.click(screen.getByText('Merge into…'));
    fireEvent.click(screen.getByText('Game'));
    await screen.findByText('That Activity is gone.');
  });

  it('disables Rename and Merge offline and calls nothing', () => {
    mount({ online: false });
    openCompanyA();
    expect((screen.getByText('Rename') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Merge into…') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Rename'));
    expect(rename).not.toHaveBeenCalled();
    expect(merge).not.toHaveBeenCalled();
  });
});
