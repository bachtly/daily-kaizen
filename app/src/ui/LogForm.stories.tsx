import type { Meta, StoryObj } from '@storybook/react-vite';
import { LogForm } from './LogForm';

const meta = {
  title: 'Screens/1 Log form',
  component: LogForm,
  parameters: {
    docs: { description: { component: 'The screen the app opens on. Only the text is required; From is the latest end time, To follows the clock ("now"). Type and tap Save to try the mock save.' } },
  },
} satisfies Meta<typeof LogForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Typing: Story = { args: { text: 'Reading PR reviews' } };
export const EmptyHistory: Story = {
  name: 'Empty (no Entries yet)',
  args: { start: '00:00', recent: [] },
};
export const Overlap: Story = { args: { text: 'Team sync', start: '10:30', overlapWith: 'Standup 10:30–10:45' } };
export const Saving: Story = { args: { text: 'Reading PR reviews', frozen: 'saving' } };
export const Saved: Story = { args: { frozen: 'saved' } };
export const NoConnectionOnSave: Story = {
  name: 'Save fails: no connection',
  args: { text: 'Reading PR reviews', saveOutcome: 'no-connection' },
  parameters: { docs: { description: { story: 'Tap Save to see the error. The text is kept and a resend is safe.' } } },
};
export const ServerError: Story = { name: 'Save fails: server error', args: { text: 'Reading PR reviews', saveOutcome: 'server-error' } };
export const EndInFuture: Story = { name: 'Error: end in the future', args: { text: 'Lunch', end: '23:00', saveOutcome: 'end-in-future' } };
export const Offline: Story = { args: { connection: 'offline' } };
export const SignedOut: Story = { args: { connection: 'signed-out', text: 'Reading PR reviews' } };
