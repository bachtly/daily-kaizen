import { describe, expect, it } from 'vitest';
import type { WeekFacts } from './facts';
import { cardsOf, changeFor, phoneFacts, resultLine, trendWeeks } from './insights';
import { card } from './insightFixtures';

describe('cards and the change', () => {
  it('lists the week cards I did not dismiss, by rank', () => {
    const all = [card('b', '2026-11-09', { rank: 2 }), card('a', '2026-11-09'), card('x', '2026-11-09', { rank: 3, status: 'dismissed' }), card('old', '2026-11-02')];
    expect(cardsOf(all, '2026-11-09').map((c) => c.id)).toEqual(['a', 'b']);
  });
  it('finds the change running in the week shown, or the one that ended last week', () => {
    const running = card('r', '2026-11-02', { status: 'accepted', active_until: '2026-11-09' });
    expect(changeFor([running], '2026-11-09')?.id).toBe('r');
    expect(changeFor([running], '2026-11-16')?.id).toBe('r'); // ended last week: its result shows
    expect(changeFor([running], '2026-11-23')).toBeNull();
    expect(changeFor([running], '2026-11-02')).toBeNull();
  });
});

describe('resultLine', () => {
  it('formats hours, counts and percents with the verdict', () => {
    expect(resultLine({ baseline: [300, 420, 360], after: [120], unit: 'min', verdict: 'helped', final: true })).toBe('Usual 5h–7h → 2h · Helped');
    expect(resultLine({ baseline: [3, 3, 3], after: [4], unit: 'count', verdict: 'worse', final: true })).toBe('Usual 3 → 4 · Worse than usual');
    expect(resultLine({ baseline: [50], after: [40], unit: 'percent', verdict: 'too_few_weeks', final: true })).toBe('Usual 50% → 40% · Too few usual weeks to tell');
  });
});

describe('phone facts and the trend', () => {
  it('computes facts with the Quiet hours and Activities from the Local copy', () => {
    const f = phoneFacts(
      [{ id: 'e', text: 't', started_at: '2026-11-02T09:00:00Z', ended_at: '2026-11-02T10:00:00Z', created_at: '2026-11-02T10:00:00Z', time_zone: 'UTC', category_id: 'deep', tag_source: null, suggested_category_id: null, tagging_gave_up_at: null, activity_ids: ['A'] }],
      '2026-11-02', 'UTC', Date.parse('2026-11-03T00:00:00Z'), [{ id: 'deep', name: 'Deep', description: '', status: 'active' }], { quiet_start: '23:00', quiet_end: '07:00' },
    );
    expect(f.hours[9].cat).toEqual({ deep: 60 });
    expect(f.hours[9].act).toEqual({ A: 60 });
    expect(f.deepBlocks).toHaveLength(1);
  });
  it('takes up to 7 earlier summaries, oldest first, then this week', () => {
    const f = (w: string) => ({ weekStart: w }) as WeekFacts;
    const summaries = ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09']
      .map((w) => ({ week_start: w, facts: f(w) as never }));
    expect(trendWeeks(summaries, f('2026-11-09')).map((x) => x.weekStart)).toEqual(
      ['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'],
    );
  });
});
