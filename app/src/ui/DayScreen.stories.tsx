import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ActivityRow, CategoryRow, EntryRow, SlotRow } from '../data/db';
import type { Result } from '../data/request';
import { expect } from 'storybook/test';
import { DayView, type DayActions } from './DayScreen';

const cat = (id: string, name: string): CategoryRow => ({ id, name, description: name, status: 'active' });
const categories: CategoryRow[] = [cat('deep', 'Deep'), cat('shallow', 'Shallow'), cat('maintenance', 'Maintenance'), cat('recovery', 'Recovery'), cat('waste', 'Waste')];

const entry = (id: string, day: string, text: string, from: string, to: string, category: string | null): EntryRow => ({
  id, text, started_at: `2026-11-${day}T${from}:00Z`, ended_at: `2026-11-${day}T${to}:00Z`, created_at: `2026-11-${day}T${to}:00Z`,
  time_zone: 'UTC', category_id: category, tag_source: category ? 'ai' : null, suggested_category_id: null, tagging_gave_up_at: null,
});
// Monday 9 to today, Tuesday 10 Nov 2026, 14:35.
const entries = [
  entry('m1', '09', 'Planning', '16:00', '18:00', 'deep'),
  entry('m2', '09', 'Dinner', '18:00', '19:00', 'recovery'),
  entry('t1', '10', 'Email triage', '07:00', '08:00', 'shallow'),
  entry('t2', '10', 'Wrote design doc', '08:00', '10:00', 'deep'),
  entry('t3', '10', 'Standup', '10:00', '10:15', null),
  entry('t4', '10', 'Lunch walk', '11:45', '12:45', 'recovery'),
  { ...entry('t5', '10', 'Parking permit', '12:45', '13:05', null), tagging_gave_up_at: '2026-11-10T13:30:00Z' },
  entry('t6', '10', 'Code review', '13:05', '14:25', 'deep'),
];

const activities: ActivityRow[] = [
  { id: 'ca', name: 'Company A', status: 'active', merged_into_id: null },
  { id: 'lu', name: 'Lunch', status: 'active', merged_into_id: null },
  { id: 'sp', name: 'Side project', status: 'active', merged_into_id: null },
];
// t2 is multitasking: two Activities (#79)
const activityOf: Record<string, string[]> = { t1: ['ca'], t2: ['ca', 'sp'], t4: ['lu'], t6: ['ca'], m1: ['sp'] };
const labelled: EntryRow[] = entries.map((e) => ({ ...e, activity_id: activityOf[e.id]?.[0] ?? null, activity_ids: activityOf[e.id] ?? [] }));
// Tuesday is Postgres dow 2
const slots: SlotRow[] = [
  { activity_id: 'ca', dow: 2, hour: 14, n: 6 },
  { activity_id: 'lu', dow: 2, hour: 14, n: 3 },
  { activity_id: 'sp', dow: 1, hour: 20, n: 2 },
];

const later = (r: Result<unknown> = { ok: true, data: null }) => () => new Promise<Result<unknown>>((res) => setTimeout(() => res(r), 600));
const actions: DayActions = { createEntry: later(), editEntry: later(), deleteEntry: later(), setEntryTag: later(), setEntryActivities: later() };
const at = (iso: string) => Date.parse(iso);

const meta = {
  title: 'Screens/1 Day',
  component: DayView,
  args: {
    date: '2026-11-10', timeZone: 'UTC', now: at('2026-11-10T14:35:00Z'), entries, categories,
    refreshedAt: '2026-11-10T14:30:00Z', actions, onPickDay: () => {},
  },
  parameters: {
    docs: { description: { component: 'The home screen (05-ui D5): a week strip, the day\'s coverage, its Entries with Unlogged slots to Fill, and a floating + to log now. Tap + or Fill to try the mock save.' } },
  },
} satisfies Meta<typeof DayView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Today: Story = {};
export const PastDay: Story = { name: 'Past day (Mon 9)', args: { date: '2026-11-09' } };
export const EmptyDay: Story = { name: 'Nothing logged', args: { date: '2026-11-09', entries: entries.filter((e) => !e.id.startsWith('m')) } };
export const LogNow: Story = { name: 'Log now (+)', args: { initialSheet: { kind: 'now' } } };
export const LogNowTyping: Story = { name: 'Log now: typing', args: { initialSheet: { kind: 'now' }, initialText: 'Reading PR reviews' } };
export const LogNowPastDay: Story = { name: 'Log now on a past day (Mon 9)', args: { date: '2026-11-09', initialSheet: { kind: 'now' } } };
export const Fill: Story = {
  name: 'Fill a slot (Mon 9, 19:00–23:30)',
  args: { date: '2026-11-09', entries: [...entries, entry('m3', '09', 'Late call', '23:30', '23:50', 'shallow')], initialSheet: { kind: 'fill', start: at('2026-11-09T19:00:00Z'), end: at('2026-11-09T23:30:00Z'), day: '2026-11-09' }, initialText: 'Reading' },
};
export const FillFails: Story = {
  name: 'Fill: save fails',
  args: { ...Fill.args, actions: { ...actions, createEntry: later({ ok: false, error: 'unknown' }) } },
  parameters: { docs: { description: { story: 'Tap Save to see "Needs a connection."; the text stays.' } } },
};
export const EditInline: Story = { name: 'Edit an Entry inline', args: { initialEditId: 't2' } };
export const TagPickerOpen: Story = { name: 'Change a Tag', args: { initialPickerId: 't3' } };
export const Loading: Story = { args: { load: 'loading', refreshedAt: null } };
export const EarlierDayOffline: Story = { name: 'Earlier day: offline', args: { date: '2026-10-21', entries: [], load: 'offline-earlier-week', connection: 'offline' } };
export const EarlierDaySignedOut: Story = { name: 'Earlier day: signed out', args: { date: '2026-10-21', entries: [], load: 'session-lost-earlier-week', connection: 'signed-out' } };
const long: EntryRow[] = Array.from({ length: 14 }, (_, i) => {
  const h = String(i + 7).padStart(2, '0');
  return entry(`l${i}`, '10', `Block ${i + 1}`, `${h}:00`, `${h}:50`, i % 3 ? 'deep' : 'shallow');
});
export const LongList: Story = {
  name: 'Long list (scrolled to the bottom)',
  args: { entries: long, now: at('2026-11-10T23:55:00Z') },
  parameters: { docs: { description: { story: 'Scrolled to the end, the last row sits fully above the + (issue #70).' } } },
  play: async ({ canvasElement }) => {
    const body = canvasElement.querySelector('.phone-body') as HTMLElement;
    body.scrollTop = body.scrollHeight;
    await new Promise((r) => setTimeout(r, 300));
    const rows = body.querySelectorAll('.entry');
    const last = rows[rows.length - 1].getBoundingClientRect();
    // The + hides on scroll down, so measure where it sits when shown: its top edge is size + margin above the dock.
    const dock = (canvasElement.querySelector('.fab-dock') as HTMLElement).getBoundingClientRect();
    const fab = (canvasElement.querySelector('.fab') as HTMLElement);
    const shownTop = dock.top - fab.offsetHeight - parseFloat(getComputedStyle(fab).bottom);
    await expect(last.bottom).toBeLessThanOrEqual(shownTop);
  },
};
export const Offline: Story = { args: { connection: 'offline' } };
export const SignedOut: Story = { args: { connection: 'signed-out' } };

const withActivities = { entries: labelled, activities, slots };
export const WithActivities: Story = { name: 'With Activities: shown on each Entry', args: withActivities };
export const LogNowActivityChips: Story = {
  name: 'With Activities: Log now chips',
  args: { ...withActivities, initialSheet: { kind: 'now' } },
};
const setActivityFails = (error: 'activity_name_blank' | 'activity_name_too_long'): DayActions => ({
  ...actions, editEntry: () => Promise.resolve({ ok: true as const, data: null }),
  setEntryActivities: () => Promise.resolve({ ok: false as const, error }),
});
const saveWithNewActivity = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  await new Promise((r) => setTimeout(r, 100));
  [...canvasElement.querySelectorAll<HTMLButtonElement>('.activity-picker button')].find((b) => b.textContent === '+ Add')?.click();
  await new Promise((r) => setTimeout(r, 50));
  const input = canvasElement.querySelector('.activity-picker input') as HTMLInputElement;
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  set.call(input, 'Side project');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));
  [...canvasElement.querySelectorAll<HTMLButtonElement>('.activity-picker .row-actions button')].find((b) => b.textContent === 'Add')?.click();
  await new Promise((r) => setTimeout(r, 50));
  [...canvasElement.querySelectorAll<HTMLButtonElement>('.entry-edit .row-actions button')].find((b) => b.textContent === 'Save')?.click();
  await new Promise((r) => setTimeout(r, 100));
};
export const EditActivityTooLong: Story = {
  name: 'With Activities: edit refused, name too long',
  args: { ...withActivities, initialEditId: 't2', actions: setActivityFails('activity_name_too_long') },
  play: saveWithNewActivity,
};
export const EditActivityBlank: Story = {
  name: 'With Activities: edit refused, name blank',
  args: { ...withActivities, initialEditId: 't2', actions: setActivityFails('activity_name_blank') },
  play: saveWithNewActivity,
};
export const EditActivity: Story = {
  name: 'With Activities: edit an Entry with two Activities',
  args: { ...withActivities, initialEditId: 't2' },
};
const threeActivities: EntryRow[] = labelled.map((e) => (e.id === 't2' ? { ...e, activity_ids: ['ca', 'lu', 'sp'] } : e));
export const EditActivityFull: Story = {
  name: 'With Activities: edit an Entry at 3 (no + Add)',
  args: { ...withActivities, entries: threeActivities, initialEditId: 't2' },
};
export const EditActivityAdding: Story = {
  name: 'With Activities: adding one',
  args: { ...withActivities, initialEditId: 't1' },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await new Promise((r) => setTimeout(r, 100));
    [...canvasElement.querySelectorAll<HTMLButtonElement>('.activity-picker button')].find((b) => b.textContent === '+ Add')?.click();
    await new Promise((r) => setTimeout(r, 100));
  },
};
