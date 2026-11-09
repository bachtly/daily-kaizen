import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettingsView } from './SettingsScreen';

const meta = {
  title: 'Screens/3 Settings',
  component: SettingsView,
} satisfies Meta<typeof SettingsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PushOff: Story = {};
export const Loading: Story = { name: 'Loading', args: { loading: { push: true, hours: true, speed: true } } };
export const PushOn: Story = { args: { push: 'on', saved: true, saveP95: 420, refreshP95: 610 } };
export const PushDenied: Story = { args: { push: 'denied' } };
export const NotOnHomeScreen: Story = { name: 'Not on the Home Screen', args: { push: 'not-installed' } };
export const QuietHoursInvalid: Story = { name: 'Quiet hours: start equals end', args: { quietStart: '23:00', quietEnd: '23:00' } };
export const Offline: Story = { args: { connection: 'offline', refreshedAt: '14:02' } };
export const SignedOut: Story = { args: { connection: 'signed-out' } };
export const Saving: Story = { args: { saving: true } };
export const SaveFailed: Story = { name: 'Save failed', args: { saveProblem: 'Needs a connection.' } };
export const TurnOnFailed: Story = { name: 'Turn on failed', args: { pushProblem: "Couldn't turn on. Try again." } };
