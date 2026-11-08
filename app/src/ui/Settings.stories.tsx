import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettingsScreen } from './SettingsScreen';

const meta = {
  title: 'Screens/3 Settings',
  component: SettingsScreen,
} satisfies Meta<typeof SettingsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PushOff: Story = {};
export const PushOn: Story = { args: { push: 'on', saved: true } };
export const PushDenied: Story = { args: { push: 'denied' } };
export const NotOnHomeScreen: Story = { name: 'Not on the Home Screen', args: { push: 'not-installed' } };
export const QuietHoursInvalid: Story = { name: 'Quiet hours: start equals end', args: { quietStart: '23:00', quietEnd: '23:00', quietError: true } };
export const Offline: Story = { args: { connection: 'offline' } };
