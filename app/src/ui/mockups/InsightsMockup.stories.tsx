import type { Meta, StoryObj } from '@storybook/react-vite';
import { InsightsMockup } from './InsightsMockup';

const meta = {
  title: 'Mockups/80 Insights',
  component: InsightsMockup,
  parameters: {
    docs: {
      description: {
        component: 'Mockup for #80, not wired to the app. Up to 3 insights a week at the top of the Week page, each with an if-then suggestion and one checked source (what it showed, limits, and the case against when evidence is mixed). Below: a heatmap of when each Category happens. Buttons work in the canvas.',
      },
    },
  },
} satisfies Meta<typeof InsightsMockup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: 'Insights' };
export const AllInsights: Story = { name: 'All insights (See more)', args: { expanded: true } };
export const NotUseful: Story = { name: 'Not useful, with a reason', args: { dismissedId: 'late-waste' } };
export const EvidenceOpen: Story = { name: 'Evidence open (mixed)', args: { openEvidence: 'focus-length' } };
export const Accepted: Story = { name: 'Made next week’s change', args: { acceptedId: 'late-waste', openEvidence: 'late-waste' } };
export const NextWeek: Story = {
  name: 'Next week: did it help?',
  args: {
    acceptedId: 'late-waste',
    lastWeek: { change: 'If it’s 21:00, then I put the phone on the charger outside the room.', result: 'Waste after 21:00: 6h → 2h' },
  },
};
export const TooEarly: Story = { name: 'Too early (3 logged days)', args: { state: 'too-early', loggedDays: 3 } };
