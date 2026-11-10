import { describe, expect, it } from 'vitest';
import { coverage, dateOf, dayBounds, dayItems, lastSlot, loggedMs, shiftDate } from './day';

const e = (id: string, from: string, to: string, category: string | null = null, created = to) => ({
  id, started_at: from, ended_at: to, created_at: created, category_id: category,
});
const MON = dayBounds('2026-11-09', 'UTC');
const ms = Date.parse;

describe('day helpers', () => {
  it('finds the date, moves it, and bounds a day in the zone (DST included)', () => {
    expect(dateOf(ms('2026-11-09T23:30:00Z'), 'Asia/Ho_Chi_Minh')).toBe('2026-11-10');
    expect(shiftDate('2026-11-01', -1)).toBe('2026-10-31');
    const b = dayBounds('2026-03-08', 'America/New_York'); // spring forward: a 23 h day
    expect((b.end - b.start) / 3600_000).toBe(23);
  });

  it('counts logged time once for overlaps', () => {
    const list = [e('a', '2026-11-09T09:00:00Z', '2026-11-09T10:00:00Z'), e('b', '2026-11-09T09:30:00Z', '2026-11-09T11:00:00Z')];
    expect(loggedMs(list, MON, ms('2026-11-10T00:00:00Z')) / 60_000).toBe(120);
  });
});

describe('dayItems (AC-1.4)', () => {
  const past = ms('2026-11-10T12:00:00Z');

  it('puts a slot wherever 10 minutes or more is unlogged: before the first Entry, between, and after the last to 24:00', () => {
    const list = [
      e('a', '2026-11-09T16:00:00Z', '2026-11-09T18:00:00Z'),
      e('b', '2026-11-09T18:05:00Z', '2026-11-09T19:00:00Z'), // 5 min: no slot
      e('c', '2026-11-09T23:30:00Z', '2026-11-09T23:45:00Z'),
    ];
    const items = dayItems(list, MON, past);
    expect(items.map((i) => (i.kind === 'slot' ? `slot ${new Date(i.start).toISOString().slice(11, 16)}-${new Date(i.end).toISOString().slice(11, 16)}` : i.entry.id)))
      .toEqual(['slot 00:00-16:00', 'a', 'b', 'slot 19:00-23:30', 'c', 'slot 23:45-00:00']);
  });

  it("ends today's last slot at now", () => {
    const list = [e('a', '2026-11-09T07:00:00Z', '2026-11-09T08:00:00Z')];
    const items = dayItems(list, MON, ms('2026-11-09T09:30:00Z'));
    expect(items[0]).toEqual({ kind: 'slot', start: MON.start, end: ms('2026-11-09T07:00:00Z') });
    expect(items[2]).toEqual({ kind: 'slot', start: ms('2026-11-09T08:00:00Z'), end: ms('2026-11-09T09:30:00Z') });
  });

  it('makes an empty day one slot: the whole past day, or 00:00 to now today, nothing for a future day', () => {
    expect(dayItems([], MON, past)).toEqual([{ kind: 'slot', start: MON.start, end: MON.end }]);
    expect(dayItems([], MON, ms('2026-11-09T06:00:00Z'))).toEqual([{ kind: 'slot', start: MON.start, end: ms('2026-11-09T06:00:00Z') }]);
    expect(dayItems([], MON, ms('2026-11-08T12:00:00Z'))).toEqual([]);
  });

  it('shows an Entry crossing midnight on both days and measures slots from its clipped end', () => {
    const list = [e('sleep', '2026-11-08T23:00:00Z', '2026-11-09T07:00:00Z'), e('b', '2026-11-09T08:00:00Z', '2026-11-09T09:00:00Z')];
    const items = dayItems(list, MON, past);
    expect(items.map((i) => i.kind)).toEqual(['entry', 'slot', 'entry', 'slot']);
    expect(dayItems(list, dayBounds('2026-11-08', 'UTC'), past).map((i) => i.kind)).toEqual(['slot', 'entry']);
  });

  it('makes no slot inside an overlap', () => {
    const list = [e('a', '2026-11-09T09:00:00Z', '2026-11-09T12:00:00Z'), e('b', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z'), e('c', '2026-11-09T12:00:00Z', '2026-11-09T13:00:00Z')];
    const slots = dayItems(list, MON, past).filter((i) => i.kind === 'slot');
    expect(slots.some((i) => i.start < ms('2026-11-09T13:00:00Z') && i.end > ms('2026-11-09T09:00:00Z'))).toBe(false);
  });
});

describe('lastSlot', () => {
  it('is the latest unlogged stretch of the day, or nothing when the day is full', () => {
    const list = [e('a', '2026-11-09T09:00:00Z', '2026-11-09T18:00:00Z')];
    expect(lastSlot(list, MON, ms('2026-11-12T00:00:00Z'))).toEqual({ kind: 'slot', start: ms('2026-11-09T18:00:00Z'), end: MON.end });
    expect(lastSlot([e('all', '2026-11-08T22:00:00Z', '2026-11-10T01:00:00Z')], MON, ms('2026-11-12T00:00:00Z'))).toBeUndefined();
  });
});

describe('coverage', () => {
  it('merges touching stretches of one Category and gives an overlap to the Entry created last', () => {
    const list = [
      e('a', '2026-11-09T09:00:00Z', '2026-11-09T10:00:00Z', 'deep'),
      e('b', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z', 'deep'),
      e('c', '2026-11-09T10:30:00Z', '2026-11-09T12:00:00Z', null, '2026-11-09T13:00:00Z'),
    ];
    const seg = coverage(list, MON, ms('2026-11-10T00:00:00Z')).map((s) => [new Date(s.start).toISOString().slice(11, 16), new Date(s.end).toISOString().slice(11, 16), s.categoryId]);
    expect(seg).toEqual([['09:00', '10:30', 'deep'], ['10:30', '12:00', null]]);
  });

  it('stops at now', () => {
    const list = [e('a', '2026-11-09T09:00:00Z', '2026-11-09T12:00:00Z', 'deep')];
    expect(coverage(list, MON, ms('2026-11-09T10:00:00Z'))[0].end).toBe(ms('2026-11-09T10:00:00Z'));
  });
});
