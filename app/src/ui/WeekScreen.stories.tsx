import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CategoryRow, EntryRow } from '../data/db';
import { WeekView } from './WeekScreen';

const cat = (id: string, name: string): CategoryRow => ({ id, name, description: name, status: 'active' });
const categories = [
  cat('deep', 'Deep'),
  cat('shallow', 'Shallow'),
  cat('maintenance', 'Maintenance'),
  cat('recovery', 'Recovery'),
  cat('waste', 'Waste'),
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
  entry('e6', '03', 'Tax form', '11:00', '11:20', null),
  entry('e7', '04', 'Commute', '08:00', '08:40', 'maintenance'),
  entry('e8', '04', 'Scrolled reddit', '13:00', '13:20', 'waste'),
];

const weekEarlier = (iso: string) => new Date(Date.parse(iso) - 7 * 86_400_000).toISOString();
const ok = () => Promise.resolve({ ok: true as const, data: null });

const meta = {
  title: 'Screens/2 This week',
  component: WeekView,
  args: {
    monday: '2026-11-02', timeZone: 'UTC', now: Date.parse('2026-11-04T14:05:00Z'), isCurrentWeek: true,
    entries, categories, reviewDone: false, refreshedAt: '2026-11-04T14:02:00Z', onReviewDone: ok,
  },
  parameters: {
    docs: { description: { component: 'Time per Category for a week, with Unlogged and Untagged as neutral grey rows. Read from the Local copy; earlier weeks are fetched.' } },
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
export const EarlierWeekLoading: Story = { args: { monday: '2026-10-19', isCurrentWeek: false, reviewDone: undefined, load: 'loading' } };
export const EarlierWeekOffline: Story = {
  args: { monday: '2026-10-19', isCurrentWeek: false, reviewDone: undefined, load: 'offline-earlier-week', connection: 'offline' },
};
export const Offline: Story = {
  args: { connection: 'offline' },
  parameters: { docs: { description: { story: 'Tap "Mark review done" to see "Needs a connection."' } } },
};
export const SignedOut: Story = { args: { connection: 'signed-out' } };
