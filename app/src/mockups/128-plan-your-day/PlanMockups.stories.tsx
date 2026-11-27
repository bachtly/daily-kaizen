import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { BlockSheet, CopySheet, DayWithPlan, HeadsUpPush, PlanTab, SettingsPlan, WeekPlan } from './PlanMockups';
import { mondayPlan, tuesdayPlan } from './plan.mocks';

// #128 Plan your day: mockups for the design review. Mock data only. Today is Mon 30 Nov 2026, 10:35.

const meta = {
  title: 'Mockups/128 Plan your day',
  parameters: {
    docs: {
      description: {
        component:
          'Design mockups for #128 (docs/design/128-plan-your-day.md). Q1 Where the plan lives: Option A (Day view) vs Option B (Plan tab). ' +
          'Q2 Layout: Option A (agenda list) vs Option B (hour grid). The other stories show the screens either way.',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const standup = mondayPlan.find((b) => b.id === 'p3')!;

// ---- Q1: where the plan lives ----
export const Q1OptionADayView: Story = {
  name: 'Q1 Option A Plan in the Day view',
  render: () => <DayWithPlan blocks={mondayPlan} />,
  parameters: { docs: { description: { story: 'Past hours show Entries; a missed block offers Log as planned. From the Now line on, the day shows its plan. The next block is marked.' } } },
};
export const Q1OptionBPlanTab: Story = {
  name: 'Q1 Option B Own Plan tab',
  render: () => <PlanTab blocks={mondayPlan} />,
  parameters: { docs: { description: { story: 'A fourth tab, Plan. The Day view stays as it is today (log only).' } } },
};

// ---- Q2: list or hour grid (shown in the Plan tab, same data) ----
export const Q2OptionAList: Story = {
  name: 'Q2 Option A Agenda list',
  render: () => <PlanTab blocks={mondayPlan} layout="list" />,
};
export const Q2OptionBGrid: Story = {
  name: 'Q2 Option B Hour grid',
  render: () => <PlanTab blocks={mondayPlan} layout="grid" />,
};

// ---- Screens, either option ----
export const DayEmpty: Story = { name: 'Day view: no plan yet', render: () => <DayWithPlan blocks={[]} empty /> };
export const DayOffline: Story = { name: 'Day view: offline', render: () => <DayWithPlan blocks={mondayPlan} connection="offline" /> };
export const NewBlock: Story = { name: 'Block sheet: new block', render: () => <WeekPlanOverlay sheet={<BlockSheet />} /> };
export const EditBlock: Story = { name: 'Block sheet: edit, only this day or every Monday', render: () => <WeekPlanOverlay sheet={<BlockSheet block={standup} scope="day" />} /> };
export const BlockTextEmpty: Story = { name: 'Block sheet: empty text refused', render: () => <WeekPlanOverlay sheet={<BlockSheet block={standup} error="text" />} /> };
export const BlockEndBeforeStart: Story = { name: 'Block sheet: end before start refused', render: () => <WeekPlanOverlay sheet={<BlockSheet error="end" />} /> };
export const WeekPlanMonday: Story = { name: 'Week plan: Monday', render: () => <WeekPlan day="Mon" blocks={mondayPlan} /> };
export const WeekPlanTuesday: Story = { name: 'Week plan: Tuesday', render: () => <WeekPlan day="Tue" blocks={tuesdayPlan} /> };
export const WeekPlanEmpty: Story = { name: 'Week plan: empty day', render: () => <WeekPlan day="Wed" blocks={[]} /> };
export const WeekPlanSaturday: Story = { name: 'Week plan: Saturday on', render: () => <WeekPlan day="Sat" blocks={[]} days={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']} /> };
export const CopyDays: Story = { name: 'Week plan: copy Monday to…', render: () => <WeekPlanOverlay sheet={<CopySheet from="Mon" />} /> };
export const SettingsPlanPanel: Story = { name: 'Settings: Plan days and Heads-up', render: () => <SettingsPlan /> };
export const SettingsHeadsUpOff: Story = { name: 'Settings: Heads-up off, Saturday on', render: () => <SettingsPlan days={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']} lead={0} /> };
export const Push: Story = { name: 'Heads-up push (lock screen)', render: () => <HeadsUpPush /> };

function WeekPlanOverlay({ sheet }: { sheet: ReactNode }) {
  return <WeekPlan day="Mon" blocks={mondayPlan} overlay={sheet} />;
}
