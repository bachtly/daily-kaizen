import type { Meta, StoryObj } from '@storybook/react-vite';
import { EVIDENCE } from '../../../supabase/functions/_shared/evidence.ts';
import type { ActivityRow, CategoryRow, EntryRow, InsightRow, SummaryRow } from '../data/db';
import { card } from '../data/insightFixtures';
import type { Result } from '../data/request';
import type { InsightActions } from './Insights';
import { LogFab } from './LogFab';
import { WeekView } from './WeekScreen';

const cat = (id: string, name: string): CategoryRow => ({ id, name, description: name, status: 'active' });
const categories = [cat('deep', 'Deep'), cat('shallow', 'Shallow'), cat('maintenance', 'Maintenance'), cat('recovery', 'Recovery'), cat('waste', 'Waste')];
const activities: ActivityRow[] = [
  { id: 'ca', name: 'Company A', status: 'active', merged_into_id: null },
  { id: 'em', name: 'Email', status: 'active', merged_into_id: null },
  { id: 'gm', name: 'Game A', status: 'active', merged_into_id: null },
  { id: 'dn', name: 'Dinner', status: 'active', merged_into_id: null },
];

/** A logged week from Monday 2026-11-09 (UTC): sleep, Company A Deep work, email, dinner, Game A after 21:00. */
function week(days: number): EntryRow[] {
  const out: EntryRow[] = [];
  for (let d = 0; d < days; d++) {
    const day = 9 + d;
    const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, day, h, m)).toISOString();
    let n = 0;
    const e = (from: string, to: string, cat: string, text: string, acts: string[]) => out.push({
      id: `${day}-${++n}`, text, started_at: from, ended_at: to, created_at: to, time_zone: 'UTC', category_id: cat,
      tag_source: 'ai', suggested_category_id: null, tagging_gave_up_at: null, activity_ids: acts,
    });
    e(at(-1), at(7), 'recovery', 'Sleep', []);
    e(at(7), at(8), 'maintenance', 'Breakfast and commute', []);
    e(at(8), at(9), 'shallow', 'Email', ['em']);
    e(at(9), d === 2 ? at(9, 40) : at(12), 'deep', 'Company A feature', ['ca']);
    if (d === 2) {
      e(at(9, 40), at(9, 55), 'shallow', 'Standup', ['ca']);
      e(at(9, 55), at(10, 10), 'deep', 'Company A feature', ['ca']);
      e(at(10, 10), at(10, 25), 'shallow', 'Email', ['em']);
      e(at(10, 25), at(12), 'deep', 'Company A feature', ['ca']);
    }
    e(at(12), at(13), 'recovery', 'Lunch walk', []);
    e(at(13), at(17), 'deep', 'Company A review', ['ca']);
    e(at(17), at(19), 'shallow', 'Email and chat', ['em']);
    e(at(19), at(21), 'recovery', 'Dinner', ['dn']);
    e(at(21), at(23), 'waste', 'Game A', ['gm']);
  }
  return out;
}

const ev = (id: string) => EVIDENCE.find((e) => e.id === id) as unknown as InsightRow['evidence'];
const entries = week(6);
const cards: InsightRow[] = [
  card('late', '2026-11-09', {
    rank: 1, finding: 'Waste clusters between 21:00 and 00:00', detail: '12h of your 12h Waste this week was in that window, mostly Game A.',
    try_this: "If it's 21:00, then I put my phone on the charger outside the room.", evidence: ev('if-then-plans'),
    entry_ids: entries.filter((x) => x.category_id === 'waste').map((x) => x.id), text_source: 'ai',
  }),
  card('frag', '2026-11-09', {
    rank: 2, finding: '2 hours of Deep work had many switches', detail: '3 Deep blocks were under 20 min (0.8h); Wed 09:00 had 3 switches.',
    try_this: 'If I leave a Deep task, then I note where I stopped and the next step.', evidence: ev('attention-residue'),
  }),
  card('email', '2026-11-09', {
    rank: 3, finding: 'Email came in 12 short Entries', detail: 'About 15 min each, on 6 days; 2 of them next to Deep work.',
    try_this: "If it's 11:00 or 16:00, then I check email, and not in between.", evidence: ev('email-batching'),
  }),
  card('rec', '2026-11-09', {
    rank: 4, finding: 'Maintenance took 6h, less than your usual 10h', detail: 'Your usual weeks had 8h–12h by this point of the week.',
    try_this: "If it's Saturday morning, then I do one hour of chores first.", evidence: ev('atus-reference'),
    may_not_apply: 'You said a cleaner comes on Fridays.',
  }),
];
const summaries: SummaryRow[] = [
  ['2026-09-21', 2400, 1200, 540, 3900, 840], ['2026-09-28', 2280, 1140, 600, 3840, 900], ['2026-10-05', 2520, 1080, 480, 3960, 780],
  ['2026-10-12', 2340, 1200, 600, 3900, 960], ['2026-10-19', 2460, 1140, 540, 3840, 720], ['2026-10-26', 2400, 1080, 600, 3900, 840],
  ['2026-11-02', 2580, 1140, 480, 3960, 720],
].map(([w, deep, shallow, maintenance, recovery, waste]) => ({
  week_start: w as string,
  facts: { weekStart: w, minutes: { byCategory: { deep, shallow, maintenance, recovery, waste }, untagged: 0, unlogged: 0 } } as never,
}));

const later = (r: Result<unknown> = { ok: true, data: null }) => () => new Promise<Result<unknown>>((res) => setTimeout(() => res(r), 600));
const insightActions: InsightActions = { accept: later(), dismiss: later(), undo: later(), keep: later(), request: later() };

const meta = {
  title: 'Screens/2 Week/Insights',
  component: WeekView,
  args: {
    monday: '2026-11-09', timeZone: 'UTC', now: Date.parse('2026-11-15T18:30:00Z'), isCurrentWeek: true,
    entries, categories, activities, reviewDone: false, refreshedAt: '2026-11-15T18:20:00Z', onReviewDone: later(),
    insights: cards, summaries, settings: { quiet_start: '23:00', quiet_end: '07:00' }, insightActions,
    fab: <LogFab onOpen={() => {}} />,
  },
  parameters: {
    docs: { description: { component: 'Insights (#80): up to 3 cards then See more, each with an if-then suggestion and one checked source; the When heatmap; the 8-week trend; the change running this week or last week’s result.' } },
  },
} satisfies Meta<typeof WeekView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Cards: Story = { name: 'Insights' };
export const Accepted: Story = {
  name: 'Made next week’s change (review note prefilled)',
  args: { insights: cards.map((c) => (c.id === 'late' ? { ...c, status: 'accepted', active_until: '2026-11-16' } : c)) },
};
export const NotUseful: Story = {
  name: 'Not useful, with a reason',
  play: async ({ canvasElement }) => {
    const btn = [...canvasElement.querySelectorAll('button')].find((b) => b.textContent === 'Not useful');
    btn?.click();
  },
};
export const TooEarly: Story = { name: 'Too early (1 logged day)', args: { entries: week(1), now: Date.parse('2026-11-10T18:00:00Z'), insights: [] } };
export const MidWeek: Story = { name: 'Mid-week: Get insights now (3 logged days)', args: { entries: week(3), now: Date.parse('2026-11-12T18:00:00Z'), insights: [] } };
export const NoCardsYet: Story = { name: 'No cards yet: Get insights now', args: { insights: [] } };
export const ChangeRunning: Story = {
  name: 'This week’s change',
  args: { insights: [...cards, card('prev', '2026-11-02', { status: 'accepted', active_until: '2026-11-09', try_this: "If it's 21:00, then I put my phone on the charger outside the room." })] },
};
export const ChangeResult: Story = {
  name: 'Next week: did it help?',
  args: {
    monday: '2026-11-16', now: Date.parse('2026-11-16T09:00:00Z'), entries: [], reviewDone: undefined,
    insights: [card('late', '2026-11-09', {
      status: 'accepted', active_until: '2026-11-16', try_this: "If it's 21:00, then I put my phone on the charger outside the room.",
      result: { baseline: [720, 600, 540, 660], after: [240], unit: 'min', verdict: 'helped', final: false },
    })],
  },
};
export const Offline: Story = { args: { connection: 'offline' } };
