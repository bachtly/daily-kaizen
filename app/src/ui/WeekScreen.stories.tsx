import type { Meta, StoryObj } from '@storybook/react-vite';
import { WeekScreen } from './WeekScreen';
import { totals } from './mock';

const meta = {
  title: 'Screens/2 This week',
  component: WeekScreen,
  parameters: {
    docs: { description: { component: 'Time per Category for a week, with Unlogged and Untagged as neutral grey rows. Tap a Tag to change it; tap "Mark review done".' } },
  },
} satisfies Meta<typeof WeekScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ReviewDone: Story = { args: { reviewDone: true } };
export const TagPickerOpen: Story = { name: 'Change a Tag', args: { openPickerFor: 'e4' } };
export const EditInline: Story = { name: 'Edit an Entry inline', args: { editing: 'e2' } };
export const EditInlineOffline: Story = { name: 'Edit inline: offline', args: { editing: 'e2', connection: 'offline' } };
export const NoSuggestion: Story = { name: 'No Suggested category', args: { suggestion: null } };
export const Empty: Story = {
  name: 'Empty week',
  args: {
    entries: [],
    suggestion: null,
    totals: totals.filter((t) => t.id === 'unlogged'),
  },
};
export const EarlierWeek: Story = { args: { weekLabel: 'Week of 27 Oct', isCurrentWeek: false, reviewDone: true, suggestion: null } };
export const EarlierWeekLoading: Story = { args: { weekLabel: 'Week of 20 Oct', isCurrentWeek: false, load: 'loading' } };
export const EarlierWeekOffline: Story = {
  args: { weekLabel: 'Week of 20 Oct', isCurrentWeek: false, load: 'offline-earlier-week', connection: 'offline' },
};
export const Offline: Story = { args: { connection: 'offline', refreshedAt: '08:15' } };
export const SignedOut: Story = { args: { connection: 'signed-out' } };
