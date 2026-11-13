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
const entry = (id: string, from: string, to: string, activity: string[]): EntryRow => ({
  id, text: `Entry ${id}`, started_at: `2026-11-04T${from}:00Z`, ended_at: `2026-11-04T${to}:00Z`, created_at: `2026-11-04T${to}:00Z`,
  time_zone: 'UTC', category_id: 'deep', tag_source: 'ai', suggested_category_id: null, tagging_gave_up_at: null,
  activity_ids: activity, activity_source: activity.length ? 'ai' : null,
});
const entries = [entry('a', '09:00', '09:40', ['ca']), entry('b', '09:40', '10:20', [])];
// Wednesday is Postgres dow 3; the sheet opens at 10:20 (hour 10)
const slots: SlotRow[] = [
  { activity_id: 'gm', dow: 3, hour: 10, n: 4 },
  { activity_id: 'ca', dow: 1, hour: 9, n: 9 },
];

const ok: Result<unknown> = { ok: true, data: null };
const fail = (error: string) => ({ ok: false, error }) as Result<unknown>;
const acts = (over: Partial<DayActions> = {}) => ({
  createEntry: vi.fn(async () => ok), editEntry: vi.fn(async () => ok), deleteEntry: vi.fn(async () => ok), setEntryTag: vi.fn(async () => ok),
  setEntryActivities: vi.fn<(id: string, names: string[]) => Promise<Result<unknown>>>(async () => ok), ...over,
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

afterEach(() => { cleanup(); clearDrafts(); });

describe('Day view: Activities on each Entry', () => {
  it('shows the Activities as "A · B" after the text, and nothing for an Entry without any', () => {
    day(acts(), { entries: [entry('a', '09:00', '09:40', ['ca', 'gm']), entry('b', '09:40', '10:20', [])] });
    const row = screen.getByLabelText(/^Edit Entry a,/);
    expect(row.querySelector('.act')?.textContent).toBe('Company A · Game');
    expect(row.getAttribute('aria-label')).toContain('Company A · Game');
    expect(screen.getByLabelText(/^Edit Entry b,/).querySelector('.act')).toBeNull();
  });

  it('shows no picker when the writes cannot set Activities', () => {
    day(acts({ setEntryActivities: undefined }));
    openEditor('a');
    expect(screen.queryByRole('group', { name: 'Activities' })).toBeNull();
  });
});

describe('EntryEditor: Activities', () => {
  const picker = () => screen.getByRole('group', { name: 'Activities' });
  const names = () => within(picker()).getAllByRole('button', { name: /^Remove / }).map((b) => b.getAttribute('aria-label'));
  const addByChip = (name: string) => {
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.click(within(screen.getByRole('group', { name: 'Pick an Activity' })).getByText(name));
  };
  const addTyped = (name: string) => {
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText('Activity name'), { target: { value: name } });
    fireEvent.click(within(picker()).getByRole('button', { name: 'Add' }));
  };

  it('starts with the current Activities as chips with a remove ×, and + Add', () => {
    day(acts());
    openEditor('a');
    expect(names()).toEqual(['Remove Company A']);
    expect(screen.getByText('+ Add')).toBeTruthy();
    expect(screen.getByText('Activities (up to 3)')).toBeTruthy();
  });

  it('offers Active ones not already on the Entry', () => {
    day(acts());
    openEditor('a');
    fireEvent.click(screen.getByText('+ Add'));
    const group = screen.getByRole('group', { name: 'Pick an Activity' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Game']);
  });

  it('saves the fields first, then the new list', async () => {
    const a = acts();
    day(a);
    openEditor('a');
    addByChip('Game');
    expect(names()).toEqual(['Remove Company A', 'Remove Game']);
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(a.setEntryActivities).toHaveBeenCalledWith('a', ['Company A', 'Game']));
    expect(vi.mocked(a.editEntry).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(a.setEntryActivities).mock.invocationCallOrder[0]);
  });

  it('takes a new typed name, trimmed, and ignores one already on the Entry', async () => {
    const a = acts();
    day(a);
    openEditor('b');
    addTyped('  Side   project ');
    addTyped('side PROJECT');
    expect(names()).toEqual(['Remove Side project']);
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(a.setEntryActivities).toHaveBeenCalledWith('b', ['Side project']));
  });

  it('Save takes a name typed but not confirmed with Add', async () => {
    const a = acts();
    day(a);
    openEditor('b');
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText('Activity name'), { target: { value: 'Side project' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(a.setEntryActivities).toHaveBeenCalledWith('b', ['Side project']));
  });

  it('caps the typed name at 60 characters', () => {
    day(acts());
    openEditor('a');
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getByLabelText('Activity name').getAttribute('maxlength')).toBe('60');
  });

  it('stops at 3: + Add goes away', () => {
    const sp: ActivityRow = { id: 'sp', name: 'Side project', status: 'active', merged_into_id: null };
    day(acts(), { entries: [entry('a', '09:00', '09:40', ['ca', 'gm', 'sp']), entry('b', '09:40', '10:20', [])], activities: [...activities, sp] });
    openEditor('a');
    expect(names()).toHaveLength(3);
    expect(screen.queryByText('+ Add')).toBeNull();
    fireEvent.click(screen.getByLabelText('Remove Game'));
    expect(screen.getByText('+ Add')).toBeTruthy();
  });

  it('× removes one, and removing all clears the list', async () => {
    const a = acts();
    day(a);
    openEditor('a');
    fireEvent.click(screen.getByLabelText('Remove Company A'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(a.setEntryActivities).toHaveBeenCalledWith('a', []));
  });

  it('leaves the Activities alone when they did not change, so a text edit can be re-labelled by the AI', async () => {
    const a = acts();
    day(a);
    openEditor('a');
    fireEvent.change(screen.getByLabelText('What I did'), { target: { value: 'New text' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(a.editEntry).toHaveBeenCalled());
    expect(a.setEntryActivities).not.toHaveBeenCalled();
  });

  it.each([
    ['activity_name_blank', 'Write an Activity name.'],
    ['activity_name_too_long', 'Use 60 characters or fewer.'],
  ] as const)('shows a message when the Server answers %s, and keeps the editor open', async (error, text) => {
    const a = acts({ setEntryActivities: vi.fn(async () => fail(error)) });
    day(a);
    openEditor('b');
    addTyped('Side project');
    fireEvent.click(screen.getByText('Save'));
    expect(await within(picker()).findByText(text)).toBeTruthy();
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('keeps the editor open with a message when the Activities write fails', async () => {
    const a = acts({ setEntryActivities: vi.fn(async () => fail('server')) });
    day(a);
    openEditor('a');
    addByChip('Game');
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText("Couldn't save. Try again.");
    expect(names()).toEqual(['Remove Company A', 'Remove Game']);
  });

  it('does not set the Activities when saving the fields fails', async () => {
    const a = acts({ editEntry: vi.fn(async () => fail('unknown')) });
    day(a);
    openEditor('a');
    addByChip('Game');
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Needs a connection.');
    expect(a.setEntryActivities).not.toHaveBeenCalled();
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
  const text = () => (screen.getByLabelText('What I did') as HTMLInputElement).value;

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
    fireEvent.change(screen.getByLabelText('What I did'), { target: { value: 'Standup' } });
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
