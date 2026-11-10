import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CategoryRow, EntryRow } from '../data/db';
import type { Result } from '../data/request';
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

const later = (r: Result<unknown> = { ok: true, data: null }) => () => new Promise<Result<unknown>>((res) => setTimeout(() => res(r), 600));
const actions: DayActions = { createEntry: later(), editEntry: later(), deleteEntry: later(), setEntryTag: later() };
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
export const Offline: Story = { args: { connection: 'offline' } };
export const SignedOut: Story = { args: { connection: 'signed-out' } };
