import { describe, expect, it } from 'vitest';
import { activityChips, activityTotals, lastWeekNote, MAX_CHIPS, type ActivityEntry } from './activities';
import { weekBounds, weekTotals } from './week';

const act = (id: string, name = id, status: 'active' | 'merged' = 'active') => ({
  id,
  name,
  status,
  merged_into_id: status === 'merged' ? 'a' : null,
});
const slot = (activity_id: string, dow: number, hour: number, n: number) => ({ activity_id, dow, hour, n });

describe('activityChips', () => {
  const acts = [act('a', 'Email'), act('b', 'Gym'), act('c', 'Code'), act('d', 'Read'), act('m', 'Old', 'merged')];

  it('shows the most used for the weekday and hour first, then fills with the most used overall', () => {
    // Monday (weekday 0) = Postgres dow 1
    const slots = [slot('b', 1, 7, 5), slot('c', 1, 7, 2), slot('a', 3, 9, 20), slot('d', 4, 9, 9), slot('a', 1, 8, 1)];
    expect(activityChips(slots, acts, 0, 7).map((a) => a.id)).toEqual(['b', 'c', 'a']);
  });
  it('maps Monday-based weekdays to Sunday-based dow (Sunday = 6 -> 0)', () => {
    expect(activityChips([slot('b', 0, 7, 1), slot('a', 1, 7, 9)], acts, 6, 7).map((a) => a.id)).toEqual(['b', 'a']);
  });
  it('sums an Activity over the slot and the total, and shows it once', () => {
    const slots = [slot('a', 1, 7, 1), slot('a', 2, 7, 1), slot('b', 3, 7, 1)];
    expect(activityChips(slots, acts, 0, 7).map((a) => a.id)).toEqual(['a', 'b']);
  });
  it('never shows a merged Activity, even when it was used most in the slot', () => {
    const slots = [slot('m', 1, 7, 50), slot('a', 1, 7, 1)];
    expect(activityChips(slots, acts, 0, 7).map((a) => a.id)).toEqual(['a']);
  });
  it('caps at 3', () => {
    const slots = acts.map((a, i) => slot(a.id, 1, 7, 10 - i));
    expect(activityChips(slots, acts, 0, 7)).toHaveLength(MAX_CHIPS);
  });
  it('breaks ties by name and is empty with no Activities', () => {
    expect(activityChips([slot('a', 1, 7, 2), slot('c', 1, 7, 2)], acts, 0, 7).map((a) => a.name)).toEqual(['Code', 'Email']);
    expect(activityChips([], [], 0, 7)).toEqual([]);
    expect(activityChips([slot('a', 1, 7, 1)], [], 0, 7)).toEqual([]);
  });
});

const H = 3600_000;
let n = 0;
const e = (start: string, end: string, activity: string | null, category: string | null, created = ++n): ActivityEntry => ({
  id: `e${created}`,
  started_at: start,
  ended_at: end,
  created_at: new Date(Date.UTC(2026, 10, 1, 0, 0, created)).toISOString(),
  category_id: category,
  activity_ids: activity ? [activity] : [],
});

describe('activityTotals', () => {
  const bounds = weekBounds('2026-11-02', 'UTC');

  it('splits an Entry equally among its Activities and the rows add up to the logged time (#79)', () => {
    const multi = (ids: string[], start: string, end: string): ActivityEntry => ({ ...e(start, end, null, 'work'), activity_ids: ids });
    const rows = activityTotals(
      [
        multi(['a', 'b'], '2026-11-03T01:00:00Z', '2026-11-03T02:00:00Z'),
        multi(['a', 'b', 'c'], '2026-11-03T03:00:00Z', '2026-11-03T04:00:00Z'),
        multi([], '2026-11-03T05:00:00Z', '2026-11-03T05:30:00Z'),
      ],
      bounds,
    );
    const by = Object.fromEntries(rows.map((r) => [r.activityId, r]));
    expect(by.a.totalMs).toBeCloseTo(H / 2 + H / 3);
    expect(by.c.totalMs).toBeCloseTo(H / 3);
    expect(by.a.byCategory.work).toBeCloseTo(H / 2 + H / 3);
    expect(by.null.totalMs).toBe(H / 2);
    expect(rows.reduce((s, r) => s + r.totalMs, 0)).toBeCloseTo(2.5 * H);
  });
  it('1 h with two Activities is 30 min each, and a repeated Activity counts once', () => {
    const rows = activityTotals(
      [
        { ...e('2026-11-03T01:00:00Z', '2026-11-03T02:00:00Z', null, null), activity_ids: ['a', 'b'] },
        { ...e('2026-11-03T03:00:00Z', '2026-11-03T04:00:00Z', null, null), activity_ids: ['a', 'a'] },
      ],
      bounds,
    );
    expect(rows.map((r) => [r.activityId, r.totalMs])).toEqual([['a', H + H / 2], ['b', H / 2]]);
  });

  it('splits Activity x Category, largest first, "(no Activity)" last', () => {
    const rows = activityTotals(
      [
        e('2026-11-03T01:00:00Z', '2026-11-03T02:00:00Z', 'a', 'work'),
        e('2026-11-03T02:00:00Z', '2026-11-03T03:00:00Z', 'a', 'life'),
        e('2026-11-03T03:00:00Z', '2026-11-03T06:00:00Z', null, 'work'),
        e('2026-11-03T06:00:00Z', '2026-11-03T06:30:00Z', 'b', null),
        e('2026-11-03T07:00:00Z', '2026-11-03T10:00:00Z', 'c', 'work'),
      ],
      bounds,
    );
    expect(rows.map((r) => r.activityId)).toEqual(['c', 'a', 'b', null]);
    expect(rows[1]).toEqual({ activityId: 'a', totalMs: 2 * H, byCategory: { work: H, life: H }, untaggedMs: 0, targetMs: null, categoryTargetMs: {} });
    expect(rows[2]).toEqual({ activityId: 'b', totalMs: H / 2, byCategory: {}, untaggedMs: H / 2, targetMs: null, categoryTargetMs: {} });
    expect(rows[3].totalMs).toBe(3 * H);
  });
  it('omits "(no Activity)" when every Entry has one', () => {
    const rows = activityTotals([e('2026-11-03T01:00:00Z', '2026-11-03T02:00:00Z', 'a', 'work')], bounds);
    expect(rows.map((r) => r.activityId)).toEqual(['a']);
  });
  it('counts only the part of a week-crossing Entry inside the week', () => {
    const rows = activityTotals(
      [
        e('2026-11-01T22:00:00Z', '2026-11-02T01:00:00Z', 'a', 'work'), // Sun 22:00 to Mon 01:00
        e('2026-11-08T23:00:00Z', '2026-11-09T02:00:00Z', 'b', 'work'), // Sun 23:00 to next Mon 02:00
      ],
      bounds,
    );
    expect(rows.find((r) => r.activityId === 'a')!.totalMs).toBe(H);
    expect(rows.find((r) => r.activityId === 'b')!.totalMs).toBe(H);
  });
  it('counts overlapping time once, for the Entry created last', () => {
    const rows = activityTotals(
      [
        e('2026-11-03T01:00:00Z', '2026-11-03T03:00:00Z', 'a', 'work', 1),
        e('2026-11-03T02:00:00Z', '2026-11-03T04:00:00Z', 'b', 'work', 2),
      ],
      bounds,
    );
    expect(rows.map((r) => [r.activityId, r.totalMs])).toEqual([
      ['b', 2 * H],
      ['a', H],
    ]);
  });
  it('counts only past time up to now', () => {
    const rows = activityTotals(
      [e('2026-11-03T01:00:00Z', '2026-11-03T05:00:00Z', 'a', 'work')],
      bounds,
      Date.parse('2026-11-03T03:00:00Z'),
    );
    expect(rows[0].totalMs).toBe(2 * H);
  });
  it('handles the 25 h DST day and matches weekTotals', () => {
    const ny = 'America/New_York';
    const dst = weekBounds('2026-10-26', ny); // contains Sunday 2026-11-01, 25 h long
    expect((dst.end - dst.start) / H).toBe(7 * 24 + 1);
    // Sun 00:30 EDT to Sun 03:00 EST is 3.5 h elapsed
    const entry = e('2026-11-01T04:30:00Z', '2026-11-01T08:00:00Z', 'a', 'work');
    const rows = activityTotals([entry], dst);
    expect(rows[0].totalMs).toBe(3.5 * H);
    expect(rows[0].totalMs).toBe(weekTotals([entry], dst, dst.end).byCategory.work);
    expect(activityTotals([entry], weekBounds('2026-11-02', ny))).toEqual([]);
  });
  it('agrees with weekTotals on the Category split', () => {
    const entries = [
      e('2026-11-03T01:00:00Z', '2026-11-03T03:00:00Z', 'a', 'work', 1),
      e('2026-11-03T02:00:00Z', '2026-11-03T04:00:00Z', null, 'life', 2),
      e('2026-11-04T01:00:00Z', '2026-11-04T02:00:00Z', 'b', null, 3),
    ];
    const sum: Record<string, number> = {};
    let untagged = 0;
    for (const r of activityTotals(entries, bounds)) {
      for (const [c, ms] of Object.entries(r.byCategory)) sum[c] = (sum[c] ?? 0) + ms;
      untagged += r.untaggedMs;
    }
    const wt = weekTotals(entries, bounds, bounds.end);
    expect(sum).toEqual(wt.byCategory);
    expect(untagged).toBe(wt.untaggedMs);
  });
});

describe('activityTotals with targets (#74)', () => {
  const bounds = weekBounds('2026-11-02', 'UTC');
  const target = (activity_id: string, category_id: string | null, minutes: number) => ({ id: `${activity_id}-${category_id}`, activity_id, category_id, minutes });

  it('carries the any-target and the per-Category targets on the row, in ms', () => {
    const rows = activityTotals(
      [e('2026-11-03T01:00:00Z', '2026-11-03T02:00:00Z', 'a', 'work')],
      bounds, bounds.end, [target('a', null, 1800), target('a', 'work', 900)],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].targetMs).toBe(1800 * 60_000);
    expect(rows[0].categoryTargetMs).toEqual({ work: 900 * 60_000 });
  });
  it('lists an Activity with a target but no time this week at 0, after the ones with time, ties by id', () => {
    const rows = activityTotals(
      [e('2026-11-03T01:00:00Z', '2026-11-03T02:00:00Z', 'b', 'work')],
      bounds, bounds.end, [target('z', null, 180), target('c', null, 60)],
    );
    expect(rows.map((r) => [r.activityId, r.totalMs, r.targetMs])).toEqual([['b', H, null], ['c', 0, 3600_000], ['z', 0, 180 * 60_000]]);
  });
  it('keeps "(no Activity)" last, and has no targets without any', () => {
    const rows = activityTotals([e('2026-11-03T01:00:00Z', '2026-11-03T02:00:00Z', null, 'work')], bounds, bounds.end, [target('a', null, 60)]);
    expect(rows.map((r) => r.activityId)).toEqual(['a', null]);
    expect(activityTotals([], bounds)).toEqual([]);
  });
});

describe('lastWeekNote', () => {
  const reviews = [
    { week_start: '2026-10-26', next_change: 'No games before 21:00' },
    { week_start: '2026-11-02', next_change: null },
    { week_start: '2026-11-09' },
  ];
  it('returns the note saved with the week before the one shown', () => {
    expect(lastWeekNote(reviews, '2026-11-02')).toBe('No games before 21:00');
  });
  it('is null when that week has no note, no review, or the review has no note field', () => {
    expect(lastWeekNote(reviews, '2026-11-09')).toBeNull();
    expect(lastWeekNote(reviews, '2026-11-16')).toBeNull();
    expect(lastWeekNote(reviews, '2026-10-26')).toBeNull();
  });
  it('crosses a year end', () => {
    expect(lastWeekNote([{ week_start: '2025-12-29', next_change: 'x' }], '2026-01-05')).toBe('x');
  });
});
