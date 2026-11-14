import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CategoryRow, EntryRow, InsightRow } from '../data/db';
import { adhocCard, card } from '../data/insightFixtures';
import type { Result } from '../data/request';
import { CoachNoteSection } from './CoachNote';
import type { InsightActions } from './Insights';

vi.mock('./liveWrites', () => ({ deviceZone: () => 'UTC', liveWindow: () => ({ since: '', sinceDate: '' }), writes: {} }));
const { WeekView } = await import('./WeekScreen');

const categories: CategoryRow[] = ['Deep', 'Shallow', 'Maintenance', 'Recovery', 'Waste'].map((n) => ({
  id: n.toLowerCase(), name: n, description: '', status: 'active',
}));
const ok: Result<unknown> = { ok: true, data: null };
const MONDAY = '2026-11-09';
const NOW = Date.parse('2026-11-15T18:30:00Z'); // Sunday

/** Days covered 07:00-23:00 with Deep, then Waste after 21:00: every elapsed day is a logged day. */
function loggedDays(n: number): EntryRow[] {
  const out: EntryRow[] = [];
  for (let d = 0; d < n; d++) {
    const day = String(9 + d).padStart(2, '0');
    const e = (id: string, from: string, to: string, cat: string): EntryRow => ({
      id: `${id}${d}`, text: `${cat} ${d}`, started_at: `2026-11-${day}T${from}:00Z`, ended_at: `2026-11-${day}T${to}:00Z`,
      created_at: `2026-11-${day}T${to}:00Z`, time_zone: 'UTC', category_id: cat, tag_source: null,
      suggested_category_id: null, tagging_gave_up_at: null, activity_ids: [],
    });
    out.push(e('d', '07:00', '21:00', 'deep'), e('w', '21:00', '23:00', 'waste'));
  }
  return out;
}

function actions(over: Partial<InsightActions> = {}) {
  return {
    accept: vi.fn(async () => ok), dismiss: vi.fn(async () => ok), undo: vi.fn(async () => ok),
    keep: vi.fn(async () => ok), request: vi.fn(async () => ok), ...over,
  };
}

const view = (props: Partial<React.ComponentProps<typeof WeekView>> = {}) =>
  render(
    <MemoryRouter>
      <WeekView monday={MONDAY} timeZone="UTC" now={NOW} isCurrentWeek entries={loggedDays(6)} categories={categories}
        reviewDone={false} refreshedAt={null} insights={[]} onReviewDone={async () => ok} {...props} />
    </MemoryRouter>,
  );
const panel = () => screen.getByRole('region', { name: 'Insights' });

afterEach(cleanup);

describe('Insights panel', () => {
  it('too early: says how many logged days so far', () => {
    view({ entries: loggedDays(1), now: Date.parse('2026-11-10T18:00:00Z') });
    expect(within(panel()).getByText('You can ask for insights after 2 logged days. 1 so far.')).toBeTruthy();
    expect(within(panel()).queryByRole('button', { name: 'Get insights now' })).toBeNull();
  });

  it('mid-week with 2 logged days: Get insights now, no wait for Sunday', () => {
    const a = actions();
    view({ entries: loggedDays(2), now: Date.parse('2026-11-11T18:00:00Z'), insightActions: a });
    fireEvent.click(within(panel()).getByRole('button', { name: 'Get insights now' }));
    expect(a.request).toHaveBeenCalledTimes(1);
  });

  it('no cards: Get insights now asks the Server, and a refusal says why', async () => {
    const a = actions({ request: vi.fn(async (): Promise<Result<unknown>> => ({ ok: false, error: 'too_soon' })) });
    view({ insightActions: a });
    fireEvent.click(within(panel()).getByRole('button', { name: 'Get insights now' }));
    await waitFor(() => expect(within(panel()).getByText('You can ask again in an hour.')).toBeTruthy());
    expect(a.request).toHaveBeenCalledTimes(1);
  });

  it('shows 3 cards, then See more; Why opens the evidence; See Entries lists them', () => {
    const entries = loggedDays(6);
    const cards = ['a', 'b', 'c', 'd'].map((id, i) => card(id, MONDAY, { rank: i + 1, entry_ids: i === 0 ? [entries[1].id] : [] }));
    view({ insights: cards, entries });
    expect(within(panel()).getAllByRole('article')).toHaveLength(3);
    fireEvent.click(within(panel()).getByRole('button', { name: 'See 1 more' }));
    expect(within(panel()).getAllByRole('article')).toHaveLength(4);
    const first = within(panel()).getAllByRole('article')[0];
    fireEvent.click(within(first).getByRole('button', { name: /Why:/ }));
    expect(within(first).getByText('What it showed')).toBeTruthy();
    fireEvent.click(within(first).getByRole('button', { name: 'See 1 Entries' }));
    expect(within(first).getByText('waste 0')).toBeTruthy();
  });

  it('Not useful hides the card at once, then takes an optional reason or an Undo', async () => {
    const a = actions();
    view({ insights: [card('a', MONDAY), card('b', MONDAY, { rank: 2 })], insightActions: a });
    fireEvent.click(within(within(panel()).getAllByRole('article')[0]).getByRole('button', { name: 'Not useful' }));
    expect(a.dismiss).toHaveBeenCalledWith('a');
    expect(within(panel()).getAllByRole('article')).toHaveLength(1);
    expect(within(panel()).getByText('Hidden for 8 weeks')).toBeTruthy();
    fireEvent.change(within(panel()).getByRole('textbox', { name: 'Why not useful? (optional)' }), { target: { value: 'I work nights' } });
    fireEvent.click(within(panel()).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(within(panel()).getByText('Saved. The coach will take it into account.')).toBeTruthy());
    expect(a.dismiss).toHaveBeenLastCalledWith('a', 'I work nights');
    fireEvent.click(within(panel()).getByRole('button', { name: 'Undo' }));
    expect(a.undo).toHaveBeenCalledWith('a');
    expect(within(panel()).getAllByRole('article')).toHaveLength(2);
  });

  it('Make it next week’s change accepts; an accepted card prefills the review note', () => {
    const a = actions();
    view({ insights: [card('a', MONDAY)], insightActions: a });
    fireEvent.click(screen.getByRole('button', { name: 'Make it next week’s change' }));
    expect(a.accept).toHaveBeenCalledWith('a');
    cleanup();
    view({ insights: [card('a', MONDAY, { status: 'accepted', active_until: '2026-11-16' })] });
    expect(screen.getByText('Next week’s change ✓')).toBeTruthy();
    expect((screen.getByRole('textbox', { name: /One change for next week/ }) as HTMLInputElement).value).toBe("If it's 21:00, then I do a.");
  });

  it('a card that may not apply says why', () => {
    view({ insights: [card('a', MONDAY, { may_not_apply: 'You said you work nights.' })] });
    expect(screen.getByText('May not apply to you: You said you work nights.')).toBeTruthy();
  });

  it('AI-spotted cards sit in their own section: labelled, no source, not a change, not counted in See more', () => {
    const fixed = ['a', 'b', 'c', 'd'].map((id, i) => card(id, MONDAY, { rank: i + 1 }));
    view({ insights: [...fixed, adhocCard('x', MONDAY), adhocCard('y', MONDAY, { evidence: card('e', MONDAY).evidence })] });
    expect(within(panel()).getByRole('button', { name: 'See 1 more' })).toBeTruthy();
    const spotted = screen.getByRole('region', { name: 'Spotted by AI' });
    const [x, y] = within(spotted).getAllByRole('article');
    expect(within(x).getByText('AI-spotted · not a fixed check')).toBeTruthy();
    expect(within(x).getByText(/No study checked for this one/)).toBeTruthy();
    expect(within(x).queryByRole('button', { name: 'Make it next week’s change' })).toBeNull();
    expect(within(y).getByRole('button', { name: /Why: If-then plans/ })).toBeTruthy();
  });

  it('a first week with only AI-spotted cards still shows them', () => {
    view({ insights: [adhocCard('x', MONDAY)], insightActions: actions() });
    expect(within(screen.getByRole('region', { name: 'Spotted by AI' })).getAllByRole('article')).toHaveLength(1);
    expect(within(panel()).queryByText(/most hours to win first/)).toBeNull();
  });

  it('Regenerate insights while cards are on screen', () => {
    const a = actions();
    view({ insights: [card('a', MONDAY, { generated_at: '2026-11-16T00:00:00Z' })], insightActions: a });
    fireEvent.click(within(panel()).getByRole('button', { name: 'Regenerate insights' }));
    expect(a.request).toHaveBeenCalledTimes(1);
  });

  it('Update insights shows when Entries changed after the cards were made', () => {
    view({ insights: [card('a', MONDAY, { generated_at: '2026-11-12T00:00:00Z' })], insightActions: actions() });
    expect(within(panel()).getByRole('button', { name: 'Update insights' })).toBeTruthy();
  });
});

describe('the change card', () => {
  const change = (extra: Partial<InsightRow>) => card('c', '2026-11-02', { status: 'accepted', active_until: MONDAY, ...extra });

  it('this week: Keep it one more week', async () => {
    const a = actions();
    view({ insights: [change({})], insightActions: a });
    expect(screen.getByText(/This week’s change/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it one more week' }));
    expect(a.keep).toHaveBeenCalledWith('c');
  });

  it('next week: last week’s change with its result', () => {
    const result = { baseline: [360, 420, 300], after: [120], unit: 'min', verdict: 'helped', final: true };
    view({ monday: '2026-11-16', now: Date.parse('2026-11-17T09:00:00Z'), entries: [], insights: [change({ result })] });
    expect(screen.getByText(/Last week’s change/)).toBeTruthy();
    expect(screen.getByText('Usual 5h–7h → 2h · Helped')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Keep it one more week' })).toBeNull();
  });
});

describe('heatmap and trend', () => {
  it('colours the hours with Entries and reads out a tapped hour', () => {
    view();
    const heat = screen.getByRole('img', { name: /Hours of the week by Category/ });
    fireEvent.click(heat.querySelector('[data-cell="21"]')!); // Mon 21:00
    expect(screen.getByText('Mon 21:00 · Waste')).toBeTruthy();
  });

  it('the trend shows earlier weeks from the summaries plus this week', () => {
    const summaries = ['2026-10-26', '2026-11-02'].map((w) => ({
      week_start: w,
      facts: { weekStart: w, minutes: { byCategory: { deep: 600, waste: 300 }, untagged: 0, unlogged: 0 } } as never,
    }));
    view({ summaries });
    expect(screen.getByRole('region', { name: 'Last 3 weeks' })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Waste: 5, 5, 12 hours per week/ })).toBeTruthy();
  });
});

describe('coach note in Settings', () => {
  it('edits, clears after a confirm, and says when it is too long', async () => {
    const onSave = vi.fn(async (): Promise<Result<unknown>> => ok);
    render(<CoachNoteSection note={{ body: 'I work nights.', source: 'ai' }} online onSave={onSave} updatedLabel="15 Nov" />);
    expect(screen.getByText('Written by the coach · 15 Nov')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'I work nights. No games.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('I work nights. No games.'));
    fireEvent.click(await screen.findByRole('button', { name: 'Clear' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith(''));
    onSave.mockResolvedValueOnce({ ok: false, error: 'note_too_long' });
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Keep it to 1200 characters.')).toBeTruthy();
  });
});
