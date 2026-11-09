import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CategoryRow, EntryRow } from '../data/db';
import type { Result } from '../data/request';
import { WeekView, type WeekActions } from './WeekScreen';
import { countMoves } from './weekFormat';

const NOW = Date.parse('2026-11-04T14:00:00Z');
const cat = (id: string, name: string, status: CategoryRow['status'] = 'active'): CategoryRow => ({ id, name, description: `${name} things`, status });
const categories = [cat('deep', 'Deep'), cat('shallow', 'Shallow'), cat('admin', 'Admin', 'suggested'), cat('old', 'Old', 'rejected')];
const entry = (id: string, from: string, to: string, over: Partial<EntryRow> = {}): EntryRow => ({
  id, text: `Entry ${id}`, started_at: `2026-11-02T${from}:00Z`, ended_at: `2026-11-02T${to}:00Z`, created_at: `2026-11-02T${to}:00Z`,
  time_zone: 'UTC', category_id: 'deep', tag_source: 'ai', suggested_category_id: null, tagging_gave_up_at: null, ...over,
});
const entries = [
  entry('a', '09:00', '10:00'),
  entry('b', '10:00', '11:00', { category_id: null, tagging_gave_up_at: '2026-11-02T12:00:00Z' }),
  entry('c', '11:00', '12:00', { category_id: null, suggested_category_id: 'admin' }),
  entry('d', '13:00', '14:00', { category_id: null, suggested_category_id: 'admin' }),
  entry('e', '15:00', '16:00', { category_id: 'shallow', tag_source: 'me', suggested_category_id: 'admin' }),
];

const ok: Result<unknown> = { ok: true, data: null };
const fail = (error: string) => ({ ok: false, error }) as Result<unknown>;
function actions(over: Partial<{ [K in keyof WeekActions]: ReturnType<typeof vi.fn> }> = {}) {
  return {
    editEntry: vi.fn(async () => ok), deleteEntry: vi.fn(async () => ok), setEntryTag: vi.fn(async () => ok),
    approveCategory: vi.fn(async () => ok), rejectCategory: vi.fn(async () => ok), ...over,
  };
}
function view(a: ReturnType<typeof actions>, props: Partial<React.ComponentProps<typeof WeekView>> = {}) {
  return render(
    <MemoryRouter>
      <WeekView
        monday="2026-11-02" timeZone="UTC" now={NOW} isCurrentWeek entries={entries} categories={categories} reviewDone={false}
        refreshedAt="2026-11-04T13:55:00Z" actions={a as unknown as WeekActions} moveCounts={{ admin: 2 }} {...props}
      />
    </MemoryRouter>,
  );
}
const openEditor = (id: string) => fireEvent.click(screen.getByLabelText(new RegExp(`^Edit Entry ${id},`)));

afterEach(cleanup);

describe('countMoves', () => {
  it("counts each Suggested category's Entries, leaving out those I tagged myself (AC-4.2)", () => {
    expect(countMoves(entries)).toEqual({ admin: 2 });
    expect(countMoves([])).toEqual({});
  });
});

describe('EntryEditor', () => {
  it('saves the changed text and times as an edit, then closes (AC-1.3)', async () => {
    const a = actions();
    view(a);
    openEditor('a');
    fireEvent.change(screen.getByLabelText('Activity'), { target: { value: 'Deep work' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '10:30' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(a.editEntry).toHaveBeenCalledWith('a', {
      text: 'Deep work', started_at: '2026-11-02T09:00:00.000Z', ended_at: '2026-11-02T10:30:00.000Z', time_zone: 'UTC',
    }));
    await waitFor(() => expect(screen.queryByLabelText('Activity')).toBeNull());
  });

  it('keeps the editor and says so when the result is unknown, and maps entry_not_found', async () => {
    const a = actions({ editEntry: vi.fn(async () => fail('unknown')) });
    view(a);
    openEditor('a');
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Needs a connection.');
    expect(screen.getByLabelText('Activity')).toBeTruthy();
    a.editEntry.mockResolvedValueOnce(fail('entry_not_found'));
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('This Entry was deleted.');
  });

  it('blocks Save for an empty text or To later than now, and warns about an overlap', () => {
    view(actions());
    openEditor('a');
    fireEvent.change(screen.getByLabelText('Activity'), { target: { value: ' ' } });
    expect(screen.getByText('Write what you did.')).toBeTruthy();
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Activity'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '10:30' } });
    expect(screen.getByText(/Overlaps "Entry b 10:00–11:00"/)).toBeTruthy();
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '09:00' } });
    expect(screen.getByText('From must be before To.')).toBeTruthy();
  });

  it('lets To be the current minute while now is up to a minute stale, but not later', () => {
    const today = [entry('a', '09:00', '10:00', { started_at: '2026-11-04T09:00:00Z', ended_at: '2026-11-04T10:00:00Z' })];
    view(actions(), { entries: today, now: NOW - 30_000 });
    openEditor('a');
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '14:00' } });
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '14:02' } });
    expect(screen.getByText("To can't be later than now.")).toBeTruthy();
  });

  it('shows the times in the device zone, as the row does, not the zone the Entry was logged in', () => {
    const tokyo = [entry('a', '09:00', '10:00', { time_zone: 'Asia/Tokyo' })];
    view(actions(), { entries: tokyo });
    openEditor('a');
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('09:00');
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('10:00');
  });

  it('saves with the device zone', async () => {
    const a = actions();
    view(a, { entries: [entry('a', '09:00', '10:00', { time_zone: 'Asia/Tokyo' })] });
    openEditor('a');
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(a.editEntry).toHaveBeenCalledWith('a', expect.objectContaining({ time_zone: 'UTC' })));
  });

  it('brings "This Entry was deleted." into view and drops it when the week changes', async () => {
    const scroll = vi.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
    const a = actions({ editEntry: vi.fn(async () => fail('entry_not_found')) });
    view(a, { onPrev: () => {} });
    openEditor('a');
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('This Entry was deleted.');
    expect(scroll).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Previous week'));
    expect(screen.queryByText('This Entry was deleted.')).toBeNull();
  });

  it('disables Save and Delete offline', () => {
    view(actions(), { connection: 'offline' });
    openEditor('a');
    expect(screen.getByText('Saving needs a connection.')).toBeTruthy();
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Delete') as HTMLButtonElement).disabled).toBe(true);
  });

  it('deletes only after a confirmation', async () => {
    const a = actions();
    view(a);
    openEditor('a');
    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByText('No'));
    expect(a.deleteEntry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByText('Yes'));
    await waitFor(() => expect(a.deleteEntry).toHaveBeenCalledWith('a'));
  });

  it('expands one row at a time', () => {
    view(actions());
    openEditor('a');
    openEditor('b');
    expect(screen.getAllByLabelText('Activity')).toHaveLength(1);
    expect((screen.getByLabelText('Activity') as HTMLInputElement).value).toBe('Entry b');
  });
});

describe('TagPicker', () => {
  const tagButton = (id: string) => within(screen.getByLabelText(new RegExp(`^Edit Entry ${id},`)).closest('.entry') as HTMLElement).getByLabelText(/^Category:/);

  it('lists Active Categories only and sets the chosen Tag (AC-4.1)', async () => {
    const a = actions();
    view(a);
    fireEvent.click(tagButton('b'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Deep')).toBeTruthy();
    expect(within(dialog).queryByText('Admin')).toBeNull();
    expect(within(dialog).queryByText('Old')).toBeNull();
    fireEvent.click(within(dialog).getByText('Shallow'));
    await waitFor(() => expect(a.setEntryTag).toHaveBeenCalledWith('b', 'shallow'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('says Pick another category. when the Category is no longer active', async () => {
    view(actions({ setEntryTag: vi.fn(async () => fail('category_not_active')) }));
    fireEvent.click(tagButton('b'));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Deep'));
    await screen.findByText('Pick another category.');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('closes on Escape and returns focus to the Tag button; Tab stays inside', () => {
    view(actions());
    const opener = tagButton('a');
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog');
    const buttons = within(dialog).getAllByRole('button');
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('says Needs a connection. offline without calling the Server', () => {
    const a = actions();
    view(a, { connection: 'offline' });
    fireEvent.click(tagButton('b'));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Deep'));
    expect(screen.getByText('Needs a connection.')).toBeTruthy();
    expect(a.setEntryTag).not.toHaveBeenCalled();
  });
});

describe('EntryRow', () => {
  it("shows the couldn't-tag note only for an untagged Entry that tagging gave up on (AC-3.2)", () => {
    view(actions());
    expect(screen.getAllByText("Couldn't tag this one. Pick a category.")).toHaveLength(1);
  });
});

describe('SuggestedCategoryCard', () => {
  it('shows how many Entries would move and approves or rejects (AC-4.2, AC-4.3)', async () => {
    const a = actions();
    view(a);
    expect(screen.getByText('Suggested category: Admin')).toBeTruthy();
    expect(screen.getByText('2 Entries would move.')).toBeTruthy();
    fireEvent.click(screen.getByText('Approve'));
    await waitFor(() => expect(a.approveCategory).toHaveBeenCalledWith('admin'));
    fireEvent.click(screen.getByText('Reject'));
    await waitFor(() => expect(a.rejectCategory).toHaveBeenCalledWith('admin'));
  });

  it('is silent when the category was already decided or is not active', async () => {
    const a = actions({
      approveCategory: vi.fn(async () => fail('category_already_decided')),
      rejectCategory: vi.fn(async () => fail('category_not_active')),
    });
    view(a);
    fireEvent.click(screen.getByText('Approve'));
    await waitFor(() => expect(a.approveCategory).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Reject'));
    await waitFor(() => expect(a.rejectCategory).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/Pick another/)).toBeNull();
  });

  it('says Needs a connection. offline', () => {
    const a = actions();
    view(a, { connection: 'offline' });
    fireEvent.click(screen.getByText('Approve'));
    expect(screen.getByText('Needs a connection.')).toBeTruthy();
    expect(a.approveCategory).not.toHaveBeenCalled();
  });

  it('is hidden when no Category is suggested', () => {
    view(actions(), { categories: categories.filter((c) => c.status !== 'suggested') });
    expect(screen.queryByText(/Suggested category/)).toBeNull();
  });
});
