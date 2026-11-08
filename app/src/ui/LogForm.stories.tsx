import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Result } from '../data/request';
import { LogFormView } from './LogForm';

const TZ = 'UTC';
const NOW = Date.parse('2026-11-04T10:52:00Z');
const at = (hhmm: string) => `2026-11-04T${hhmm}:00Z`;
const entry = (id: string, text: string, from: string, to: string) => ({
  id, text, started_at: at(from), ended_at: at(to), created_at: at(to),
});
const entries = [
  entry('1', 'Email triage', '08:30', '09:00'),
  entry('2', 'Wrote design doc', '09:00', '09:25'),
  entry('3', 'Standup', '09:25', '09:40'),
  entry('4', 'Lunch', '07:00', '07:30'),
];

const after = (r: Result<unknown>, ms = 600) => () => new Promise<Result<unknown>>((res) => setTimeout(() => res(r), ms));
const never = () => new Promise<Result<unknown>>(() => {});

const meta = {
  title: 'Screens/1 Log form',
  component: LogFormView,
  args: { entries, timeZone: TZ, now: NOW, onSave: after({ ok: true, data: null }) },
  parameters: {
    docs: { description: { component: 'The screen the app opens on. Only the text is required; From is the latest end time, To follows the clock ("now"). Type and tap Save to try the mock save.' } },
  },
} satisfies Meta<typeof LogFormView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Typing: Story = { args: { initialText: 'Reading PR reviews' } };
export const EmptyHistory: Story = { name: 'Empty (no Entries yet)', args: { entries: [] } };
export const Overlap: Story = {
  args: { initialText: 'Team sync', initialFrom: Date.parse(at('09:30')) },
};
export const Saving: Story = { args: { initialText: 'Reading PR reviews', frozen: 'saving', onSave: never } };
export const Saved: Story = { args: { frozen: 'saved' } };
export const NoConnectionOnSave: Story = {
  name: 'Save fails: no connection',
  args: { initialText: 'Reading PR reviews', onSave: after({ ok: false, error: 'unknown' }) },
  parameters: { docs: { description: { story: 'Tap Save to see the error. The text is kept and a resend is safe.' } } },
};
export const ServerError: Story = {
  name: 'Save fails: server error',
  args: { initialText: 'Reading PR reviews', onSave: after({ ok: false, error: 'server' }) },
};
export const SessionLostOnSave: Story = {
  name: 'Save fails: session lost',
  args: { initialText: 'Reading PR reviews', onSave: after({ ok: false, error: 'session_lost' }) },
};
export const Offline: Story = { args: { connection: 'offline' } };
export const SignedOut: Story = { args: { connection: 'signed-out', initialText: 'Reading PR reviews' } };
