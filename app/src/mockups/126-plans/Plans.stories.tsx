import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ChatEditor, CheckInSheet, PlansTab, PushPreview, SentenceEditor, StepEditor, WeekResult, WeekWithPlans,
} from './Plans';
import { Phone } from '../../ui/Phone';
import { pausedPlan, plans } from './plans.mocks';

/** #126 Plans: design mockups. Mock data only. See docs/design/126-goal-notifications.md. */
const meta = {
  title: 'Mockups/126 Plans',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// Q1: where Plans live
export const NavOptionA: Story = { name: 'Nav Option A Week page section', render: () => <WeekWithPlans plans={plans} /> };
export const NavOptionB: Story = { name: 'Nav Option B Own tab', render: () => <PlansTab plans={plans} /> };

// Q2: editor style (same draft in each)
export const EditorOptionA: Story = { name: 'Editor Option A Sentence builder', render: () => <SentenceEditor /> };
export const EditorOptionB: Story = { name: 'Editor Option B AI chat first', render: () => <ChatEditor /> };
export const EditorOptionC: Story = { name: 'Editor Option C Step form', render: () => <StepEditor /> };
export const EditorOptionCStep2: Story = { name: 'Editor Option C Step form: step 2', render: () => <StepEditor step={2} /> };
export const EditorOptionCStep3: Story = { name: 'Editor Option C Step form: step 3', render: () => <StepEditor step={3} /> };

// Plans list states (shown in Option A)
export const ListEmpty: Story = { name: 'List: empty', render: () => <WeekWithPlans plans={[]} /> };
export const ListPaused: Story = { name: 'List: paused, still useful?', render: () => <WeekWithPlans plans={[plans[0], pausedPlan]} /> };

// Editor states (shown in Option A)
export const EditorDrafting: Story = { name: 'Editor: AI drafting', render: () => <SentenceEditor state="drafting" /> };
export const EditorAiFailed: Story = { name: 'Editor: AI failed, template', render: () => <SentenceEditor state="ai-failed" /> };
export const EditorInvalid: Story = { name: 'Editor: missing Do', render: () => <SentenceEditor state="invalid" /> };

// Push and check-in
export const PushLogged: Story = { name: 'Push: after a logged Lunch', render: () => <PushPreview /> };
export const PushPredicted: Story = { name: 'Push: predicted Lunch done', render: () => <PushPreview predicted /> };
export const CheckIn: Story = { name: 'Check-in sheet', render: () => <CheckInSheet /> };

// Result on the Week page
export const Result: Story = {
  name: 'Week: Plans this week',
  render: () => <Phone tab="week"><h1>Week</h1><WeekResult /></Phone>,
};
