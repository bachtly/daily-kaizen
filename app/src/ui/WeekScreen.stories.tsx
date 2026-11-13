import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ActivityRow, CategoryRow, EntryRow } from '../data/db';
import type { Result } from '../data/request';
import { LogFab } from './LogFab';
import { WeekView, type WeekActions } from './WeekScreen';

const cat = (id: string, name: string): CategoryRow => ({ id, name, description: name, status: 'active' });
const categories: CategoryRow[] = [
  cat('deep', 'Deep'),
  cat('shallow', 'Shallow'),
  cat('maintenance', 'Maintenance'),
  cat('recovery', 'Recovery'),
  cat('waste', 'Waste'),
  { id: 'admin', name: 'Admin', description: 'Forms, bills, paperwork', status: 'suggested' },
];

const entry = (id: string, day: string, text: string, from: string, to: string, category: string | null): EntryRow => ({
  id, text, started_at: `2026-11-${day}T${from}:00Z`, ended_at: `2026-11-${day}T${to}:00Z`, created_at: `2026-11-${day}T${to}:00Z`,
  time_zone: 'UTC', category_id: category, tag_source: category ? 'ai' : null, suggested_category_id: null, tagging_gave_up_at: null,
});
const entries = [
  entry('e1', '02', 'Wrote design doc', '09:00', '11:30', 'deep'),
  entry('e2', '02', 'Email triage', '11:30', '12:15', 'shallow'),
  entry('e3', '02', 'Lunch with Sam', '12:30', '13:30', 'recovery'),
  entry('e4', '03', 'Reviewed PRs', '09:00', '10:30', 'deep'),
  entry('e5', '03', 'Standup', '10:30', '10:45', 'shallow'),
  { ...entry('e6', '03', 'Tax form', '11:00', '11:20', null), suggested_category_id: 'admin' },
  { ...entry('e9', '03', 'Parking permit', '15:00', '15:20', null), tagging_gave_up_at: '2026-11-03T16:00:00Z' },
  entry('e7', '04', 'Commute', '08:00', '08:40', 'maintenance'),
  entry('e8', '04', 'Scrolled reddit', '13:00', '13:20', 'waste'),
];

const activities: ActivityRow[] = [
  { id: 'ca', name: 'Company A', status: 'active', merged_into_id: null },
  { id: 'dn', name: 'Dinner', status: 'active', merged_into_id: null },
  { id: 'gm', name: 'Game A', status: 'active', merged_into_id: null },
];
const withActivities: EntryRow[] = entries.map((e) => ({
  ...e,
  activity_id: ['e1', 'e2', 'e4', 'e5'].includes(e.id) ? 'ca' : e.id === 'e3' ? 'dn' : e.id === 'e8' ? 'gm' : null,
}));
const openFirstActivity = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  (canvasElement.querySelector('.act-row') as HTMLButtonElement | null)?.click();
};

const weekEarlier = (iso: string) => new Date(Date.parse(iso) - 7 * 86_400_000).toISOString();
const ok = () => Promise.resolve({ ok: true as const, data: null });
const later = (r: Result<unknown> = { ok: true, data: null }) => () => new Promise<Result<unknown>>((res) => setTimeout(() => res(r), 600));
const actions: WeekActions = { approveCategory: later(), rejectCategory: later(), renameActivity: later(), mergeActivity: later() };

const meta = {
  title: 'Screens/2 Week',
  component: WeekView,
  args: {
    monday: '2026-11-02', timeZone: 'UTC', now: Date.parse('2026-11-04T14:05:00Z'), isCurrentWeek: true,
    entries, categories, reviewDone: false, refreshedAt: '2026-11-04T14:02:00Z', onReviewDone: ok,
    actions, moveCounts: { admin: 1 }, fab: <LogFab onOpen={() => {}} />,
  },
  parameters: {
    docs: { description: { component: 'Time per Category and per day for a week, with Unlogged and Untagged as neutral grey rows. Entries are edited on the Day view. Read from the Local copy; earlier weeks are fetched.' } },
  },
} satisfies Meta<typeof WeekView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ReviewDone: Story = { args: { reviewDone: true } };
export const Empty: Story = { name: 'Empty week', args: { entries: [] } };
export const EarlierWeek: Story = {
  args: {
    monday: '2026-10-26', isCurrentWeek: false, reviewDone: undefined,
    entries: entries.map((e) => ({ ...e, id: `o${e.id}`, started_at: weekEarlier(e.started_at), ended_at: weekEarlier(e.ended_at) })),
  },
};
export const Loading: Story = { args: { load: 'loading', reviewDone: undefined, refreshedAt: null } };
export const EarlierWeekLoading: Story = { args: { monday: '2026-10-19', isCurrentWeek: false, reviewDone: undefined, load: 'loading' } };
export const EarlierWeekOffline: Story = {
  args: { monday: '2026-10-19', isCurrentWeek: false, reviewDone: undefined, load: 'offline-earlier-week', connection: 'offline' },
};
export const Offline: Story = {
  args: { connection: 'offline' },
  parameters: { docs: { description: { story: 'Tap "Mark review done" to see "Needs a connection."' } } },
};
export const SignedOut: Story = { args: { connection: 'signed-out' } };
export const NoSuggestion: Story = {
  name: 'No Suggested category',
  args: { categories: categories.filter((c) => c.status === 'active') },
};

export const EarlierWeekSignedOut: Story = {
  name: 'Earlier week: signed out',
  args: { monday: '2026-10-19', isCurrentWeek: false, reviewDone: undefined, load: 'session-lost-earlier-week', connection: 'signed-out' },
};

export const WithActivities: Story = {
  name: 'With Activities',
  args: { entries: withActivities, activities },
  parameters: { docs: { description: { story: 'Tap a row for the Category split, Rename and Merge into…. Hidden while there are no Activities (Default).' } } },
};
export const ActivityOpen: Story = {
  name: 'With Activities: row open',
  args: { entries: withActivities, activities },
  play: openFirstActivity,
};
const renameFails = (error: 'activity_name_blank' | 'activity_name_too_long'): WeekActions => ({
  ...actions, renameActivity: () => Promise.resolve({ ok: false as const, error }),
});
const tryRename = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  await openFirstActivity({ canvasElement });
  const click = (text: string) => [...canvasElement.querySelectorAll('button')].find((b) => b.textContent === text)?.click();
  click('Rename');
  await new Promise((r) => setTimeout(r, 50));
  click('Save');
  await new Promise((r) => setTimeout(r, 100));
};
export const RenameTooLong: Story = {
  name: 'With Activities: rename refused, too long',
  args: { entries: withActivities, activities, actions: renameFails('activity_name_too_long') },
  play: tryRename,
};
export const RenameBlank: Story = {
  name: 'With Activities: rename refused, blank',
  args: { entries: withActivities, activities, actions: renameFails('activity_name_blank') },
  play: tryRename,
};
export const ActivitiesOffline: Story = {
  name: 'With Activities: offline',
  args: { entries: withActivities, activities, connection: 'offline' },
  play: openFirstActivity,
};
