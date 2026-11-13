import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActivityRow, CategoryRow, EntryRow, SlotRow } from '../data/db';
import type { Result } from '../data/request';
import { DayView, type DayActions } from './DayScreen';
import { clearDrafts } from './logDrafts';
import { LogSheet } from './LogSheet';

const NOW = Date.parse('2026-11-04T10:52:00Z'); // Wednesday
const categories: CategoryRow[] = [{ id: 'deep', name: 'Deep', description: '', status: 'active' }];
const activities: ActivityRow[] = [
  { id: 'ca', name: 'Company A', status: 'active', merged_into_id: null },
  { id: 'gm', name: 'Game', status: 'active', merged_into_id: null },
  { id: 'old', name: 'Old name', status: 'merged', merged_into_id: 'ca' },
];
const entry = (id: string, from: string, to: string, activity: string | null): EntryRow => ({
  id, text: `Entry ${id}`, started_at: `2026-11-04T${from}:00Z`, ended_at: `2026-11-04T${to}:00Z`, created_at: `2026-11-04T${to}:00Z`,
  time_zone: 'UTC', category_id: 'deep', tag_source: 'ai', suggested_category_id: null, tagging_gave_up_at: null,
  activity_id: activity, activity_source: activity ? 'ai' : null,
});
const entries = [entry('a', '09:00', '09:40', 'ca'), entry('b', '09:40', '10:20', null)];
// Wednesday is Postgres dow 3; the sheet opens at 10:20 (hour 10)
const slots: SlotRow[] = [
  { activity_id: 'gm', dow: 3, hour: 10, n: 4 },
  { activity_id: 'ca', dow: 1, hour: 9, n: 9 },
];

const ok: Result<unknown> = { ok: true, data: null };
const fail = (error: string) => ({ ok: false, error }) as Result<unknown>;
const acts = (over: Partial<DayActions> = {}) => ({
  createEntry: vi.fn(async () => ok), editEntry: vi.fn(async () => ok), deleteEntry: vi.fn(async () => ok), setEntryTag: vi.fn(async () => ok),
  setEntryActivity: vi.fn<(id: string, name: string | null) => Promise<Result<unknown>>>(async () => ok), ...over,
});
function day(a: ReturnType<typeof acts>, props: Partial<React.ComponentProps<typeof DayView>> = {}) {
  return render(
    <MemoryRouter>
      <DayView
        date="2026-11-04" timeZone="UTC" now={NOW} entries={entries} categories={categories} activities={activities} slots={slots}
        refreshedAt="2026-11-04T10:50:00Z" actions={a as unknown as DayActions} onPickDay={() => {}} {...props}
      />
    </MemoryRouter>,
  );
}
const openEditor = (id: string) => fireEvent.click(screen.getByLabelText(new RegExp(`^Edit Entry ${id},`)));
const label = () => screen.getByLabelText('Activity label') as HTMLInputElement;

afterEach(() => { cleanup(); clearDrafts(); });

describe('Day view: Activity on each Entry', () => {
  it('shows the Activity under the text, and nothing for an Entry without one', () => {
    day(acts());
    expect(within(screen.getByLabelText(/^Edit Entry a,/)).getByText('Company A')).toBeTruthy();
    expect(screen.getByLabelText(/^Edit Entry b,/).querySelector('.act')).toBeNull();
  });

  it('shows no picker when the writes cannot set an Activity', () => {
    day(acts({ setEntryActivity: undefined }));
    openEditor('a');
    expect(screen.queryByLabelText('Activity label')).toBeNull();
  });
});

describe('EntryEditor: Activity', () => {
  it('starts with the current Activity and offers Active ones only', () => {
    day(acts());
    openEditor('a');
    expect(label().value).toBe('Company A');
    const group = screen.getByRole('group', { name: 'Pick an Activity' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['None', 'Company A', 'Game']);
    expect(within(group).getByText('Company A').getAttribute('aria-pressed')).toBe('true');
  });

  it('saves the fields first, then the picked Activity', async () => {
    const a = acts();
    day(a);
    openEditor('a');
    fireEvent.click(within(screen.getByRole('group', { name: 'Pick an Activity' })).getByText('Game'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(a.setEntryActivity).toHaveBeenCalledWith('a', 'Game'));
    expect(vi.mocked(a.editEntry).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(a.setEntryActivity).mock.invocationCallOrder[0]);
  });

  it('takes a new typed name, trimmed', async () => {
    const a = acts();
    day(a);
    openEditor('b');
    fireEvent.change(label(), { target: { value: '  Side   project ' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(a.setEntryActivity).toHaveBeenCalledWith('b', 'Side project'));
  });

  it('None clears the Activity', async () => {
    const a = acts();
    day(a);
    openEditor('a');
    fireEvent.click(screen.getByText('None'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(a.setEntryActivity).toHaveBeenCalledWith('a', null));
  });

  it('leaves the Activity alone when it did not change, so a text edit can be re-labelled by the AI', async () => {
    const a = acts();
    day(a);
    openEditor('a');
    fireEvent.change(screen.getByLabelText('Activity'), { target: { value: 'New text' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(a.editEntry).toHaveBeenCalled());
    expect(a.setEntryActivity).not.toHaveBeenCalled();
  });

  it('keeps the editor open with a message when the Activity write fails', async () => {
    const a = acts({ setEntryActivity: vi.fn(async () => fail('server')) });
    day(a);
    openEditor('a');
    fireEvent.click(screen.getByText('Game'));
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText("Couldn't save. Try again.");
    expect(label().value).toBe('Game');
  });

  it('does not set the Activity when saving the fields fails', async () => {
    const a = acts({ editEntry: vi.fn(async () => fail('unknown')) });
    day(a);
    openEditor('a');
    fireEvent.click(screen.getByText('Game'));
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Needs a connection.');
    expect(a.setEntryActivity).not.toHaveBeenCalled();
  });
});

describe('Log sheet: Activity chips', () => {
  const mount = (props: Partial<React.ComponentProps<typeof LogSheet>> = {}) =>
    render(
      <MemoryRouter>
        <LogSheet
          mode={{ kind: 'now' }} entries={entries} timeZone="UTC" now={NOW} activities={activities} slots={slots}
          onSave={vi.fn(async () => ok)} onSaved={() => {}} onClose={() => {}} {...props}
        />
      </MemoryRouter>,
    );
  const text = () => (screen.getByLabelText('Activity') as HTMLInputElement).value;

  it('replaces Recent with the Activities for this slot, then the most used overall', () => {
    mount();
    expect(screen.queryByRole('group', { name: 'Recent' })).toBeNull();
    const group = screen.getByRole('group', { name: 'Activities' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Game', 'Company A']);
  });

  it('tap inserts "Name " into the text, after what is already typed', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Game' }));
    expect(text()).toBe('Game ');
    fireEvent.change(screen.getByLabelText('Activity'), { target: { value: 'Standup' } });
    fireEvent.click(screen.getByRole('button', { name: 'Company A' }));
    expect(text()).toBe('Standup Company A ');
  });

  it('falls back to Recent with no Activities, or only merged ones', () => {
    mount({ activities: [] });
    expect(screen.getByRole('group', { name: 'Recent' })).toBeTruthy();
    cleanup();
    mount({ activities: [activities[2]] });
    expect(screen.getByRole('group', { name: 'Recent' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Activities' })).toBeNull();
  });

  it('shows the Skeleton, not chips, while the Local copy is loading', () => {
    mount({ loading: true });
    expect(screen.queryByRole('group', { name: 'Activities' })).toBeNull();
    expect(document.querySelector('.chips .skeleton')).toBeTruthy();
  });
});
