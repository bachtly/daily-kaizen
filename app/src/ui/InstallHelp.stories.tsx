import type { Meta, StoryObj } from '@storybook/react-vite';
import { InstallHelp } from './InstallHelp';

const meta = {
  title: 'Screens/5 Add to Home Screen',
  component: InstallHelp,
  args: { browser: 'ios-safari', address: 'kaizen.bachtly.com' },
} satisfies Meta<typeof InstallHelp>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OpenedInSafari: Story = {};
export const OpenedInChrome: Story = { args: { browser: 'ios-chrome' } };
export const OpenedOnAnotherDevice: Story = { args: { browser: 'elsewhere' } };
