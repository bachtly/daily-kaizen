import { describe, expect, it } from 'vitest';
import { mondayOf, startOfDay, weekBounds, weekTotals, type WeekEntry } from './week';

const H = 3600_000;
const iso = (s: string) => Date.parse(s);

let n = 0;
function entry(start: string, end: string, category: string | null, created?: string): WeekEntry {
  n++;
  return {
    id: String(n),
    started_at: start,
    ended_at: end,
    created_at: created ?? new Date(Date.UTC(2026, 0, 1, 0, n)).toISOString(),
    category_id: category,
  };
}

describe('week bounds', () => {
  it('finds Monday in the zone, not UTC', () => {
    // Sunday 2026-11-08 20:00 UTC is already Monday 2026-11-09 in Bangkok (UTC+7)
    expect(mondayOf(iso('2026-11-08T20:00:00Z'), 'Asia/Bangkok')).toBe('2026-11-09');
    expect(mondayOf(iso('2026-11-08T20:00:00Z'), 'UTC')).toBe('2026-11-02');
  });
  it('spans 7 plain days', () => {
    const b = weekBounds('2026-11-02', 'Asia/Bangkok');
    expect(b.start).toBe(iso('2026-11-01T17:00:00Z'));
    expect(b.end - b.start).toBe(7 * 24 * H);
  });
  it('is 1 h shorter in the DST spring week (New York 2026-03-08)', () => {
    const b = weekBounds('2026-03-02', 'America/New_York');
    expect(b.end - b.start).toBe(7 * 24 * H - H);
    expect(b.start).toBe(iso('2026-03-02T05:00:00Z'));
    expect(b.end).toBe(iso('2026-03-09T04:00:00Z'));
  });
  it('is 1 h longer in the DST autumn week (New York 2026-11-01)', () => {
    const b = weekBounds('2026-10-26', 'America/New_York');
    expect(b.end - b.start).toBe(7 * 24 * H + H);
  });
  it('start of day when DST skips midnight (Asia/Beirut)', () => {
    // Beirut 2026-03-29 jumps 00:00 -> 01:00 EEST; the day starts at 01:00 EEST = 22:00Z
    const s = startOfDay(iso('2026-03-29T10:00:00Z'), 'Asia/Beirut');
    expect(s).toBe(iso('2026-03-28T22:00:00Z'));
  });
});

describe('weekTotals', () => {
  const tz = 'UTC';
  const b = weekBounds('2026-11-02', tz);
  const now = iso('2026-11-02T12:00:00Z');

  it('all Unlogged when empty', () => {
    const t = weekTotals([], b, now);
    expect(t).toEqual({ byCategory: {}, untaggedMs: 0, unloggedMs: 12 * H, elapsedMs: 12 * H });
  });
  it('sums per category, untagged and unlogged', () => {
    const t = weekTotals(
      [
        entry('2026-11-02T01:00:00Z', '2026-11-02T03:00:00Z', 'a'),
        entry('2026-11-02T03:00:00Z', '2026-11-02T04:00:00Z', 'a'),
        entry('2026-11-02T05:00:00Z', '2026-11-02T06:00:00Z', null),
      ],
      b,
      now,
    );
    expect(t.byCategory).toEqual({ a: 3 * H });
    expect(t.untaggedMs).toBe(H);
    expect(t.unloggedMs).toBe(8 * H);
  });
  it('counts overlap once, for the Entry created last', () => {
    const t = weekTotals(
      [
        entry('2026-11-02T01:00:00Z', '2026-11-02T03:00:00Z', 'a', '2026-11-02T10:00:00Z'),
        entry('2026-11-02T02:00:00Z', '2026-11-02T04:00:00Z', 'b', '2026-11-02T11:00:00Z'),
      ],
      b,
      now,
    );
    expect(t.byCategory).toEqual({ a: H, b: 2 * H });
    expect(t.unloggedMs).toBe(9 * H);
  });
  it('uses created_at, not array order', () => {
    const later = entry('2026-11-02T01:00:00Z', '2026-11-02T02:00:00Z', 'b', '2026-11-02T11:00:00Z');
    const earlier = entry('2026-11-02T01:00:00Z', '2026-11-02T02:00:00Z', 'a', '2026-11-02T10:00:00Z');
    expect(weekTotals([later, earlier], b, now).byCategory).toEqual({ b: H });
    expect(weekTotals([earlier, later], b, now).byCategory).toEqual({ b: H });
  });
  it('counts only past time', () => {
    const t = weekTotals([entry('2026-11-02T11:00:00Z', '2026-11-02T15:00:00Z', 'a')], b, now);
    expect(t.byCategory).toEqual({ a: H });
    expect(t.unloggedMs).toBe(11 * H);
  });
  it('counts the part of an Entry crossing Monday in each week', () => {
    const e = entry('2026-11-01T22:00:00Z', '2026-11-02T02:00:00Z', 'a');
    const thisWeek = weekTotals([e], b, now);
    expect(thisWeek.byCategory).toEqual({ a: 2 * H });
    const prev = weekBounds('2026-10-26', tz);
    const last = weekTotals([e], prev, now);
    expect(last.byCategory).toEqual({ a: 2 * H });
    expect(last.elapsedMs).toBe(7 * 24 * H);
  });
  it('crossing Monday in the user zone (Bangkok)', () => {
    const bb = weekBounds('2026-11-02', 'Asia/Bangkok'); // starts 2026-11-01T17:00Z
    const e = entry('2026-11-01T16:00:00Z', '2026-11-01T19:00:00Z', 'a');
    expect(weekTotals([e], bb, iso('2026-11-02T00:00:00Z')).byCategory).toEqual({ a: 2 * H });
  });
  it('handles the 23 h DST day: a full-day-long week elapsed has no negative Unlogged', () => {
    const ny = weekBounds('2026-03-02', 'America/New_York');
    const t = weekTotals([], ny, ny.end + 5 * H);
    expect(t.elapsedMs).toBe(7 * 24 * H - H);
    expect(t.unloggedMs).toBe(t.elapsedMs);
  });
  it('is all zero for a future week', () => {
    const t = weekTotals([], weekBounds('2026-12-07', tz), now);
    expect(t.elapsedMs).toBe(0);
    expect(t.unloggedMs).toBe(0);
  });
});
