import type { Meta, StoryObj } from '@storybook/react-vite';
import { SignInView } from './SignInScreen';

const meta = {
  title: 'Screens/4 Sign in',
  component: SignInView,
} satisfies Meta<typeof SignInView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Email: Story = {};
export const Sending: Story = { args: { email: 'me@example.com', busy: true } };
export const OfflineOnSend: Story = { args: { email: 'me@example.com', error: 'offline' } };
export const Code: Story = { args: { step: 'code', email: 'me@example.com', resendWaitSeconds: 42 } };
export const CodeResendReady: Story = { args: { step: 'code', email: 'me@example.com' } };
export const WrongCode: Story = { args: { step: 'code', email: 'me@example.com', error: 'wrong-code' } };
export const RateLimited: Story = { args: { step: 'code', email: 'me@example.com', error: 'rate-limited' } };
export const OpenedInSafari: Story = { args: { inSafari: true } };
