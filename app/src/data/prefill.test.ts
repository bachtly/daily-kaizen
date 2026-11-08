import { describe, expect, it } from 'vitest';
import { findOverlaps, prefill, recentTexts } from './prefill';

const iso = (s: string) => Date.parse(s);

describe('prefill', () => {
  it('starts at the latest end', () => {
    const now = iso('2026-11-08T10:00:00Z');
    const r = prefill(
      [{ ended_at: '2026-11-08T03:00:00Z' }, { ended_at: '2026-11-08T08:30:00Z' }, { ended_at: '2026-11-08T05:00:00Z' }],
      now,
      'UTC',
    );
    expect(r).toEqual({ start: iso('2026-11-08T08:30:00Z'), end: now });
  });
  it('starts at the start of today in the zone when there are no Entries', () => {
    const now = iso('2026-11-08T20:00:00Z'); // 03:00 on 9 Nov in Bangkok
    expect(prefill([], now, 'Asia/Bangkok').start).toBe(iso('2026-11-08T17:00:00Z'));
    expect(prefill([], now, 'UTC').start).toBe(iso('2026-11-08T00:00:00Z'));
  });
});

describe('recentTexts', () => {
  const mk = (text: string, min: number) => ({ text, created_at: new Date(Date.UTC(2026, 10, 8, 0, min)).toISOString() });
  it('returns the 5 latest distinct texts, newest first', () => {
    const entries = [mk('a', 1), mk('b', 2), mk('a', 3), mk('c', 4), mk('d', 5), mk('e', 6), mk('f', 7), mk('g', 8)];
    expect(recentTexts(entries)).toEqual(['g', 'f', 'e', 'd', 'c']);
  });
  it('dedupes by trimmed text and keeps the newest position', () => {
    expect(recentTexts([mk('email', 1), mk('lunch', 2), mk(' email ', 3)])).toEqual(['email', 'lunch']);
  });
  it('skips blank text and handles none', () => {
    expect(recentTexts([mk('  ', 1)])).toEqual([]);
    expect(recentTexts([])).toEqual([]);
  });
});

describe('findOverlaps', () => {
  const e = (id: string, s: string, en: string) => ({ id, started_at: s, ended_at: en });
  const list = [
    e('1', '2026-11-08T01:00:00Z', '2026-11-08T02:00:00Z'),
    e('2', '2026-11-08T02:00:00Z', '2026-11-08T03:00:00Z'),
  ];
  it('finds entries sharing time', () => {
    expect(findOverlaps(list, iso('2026-11-08T01:30:00Z'), iso('2026-11-08T02:30:00Z')).map((x) => x.id)).toEqual(['1', '2']);
  });
  it('treats touching ends as no overlap', () => {
    expect(findOverlaps(list, iso('2026-11-08T03:00:00Z'), iso('2026-11-08T04:00:00Z'))).toEqual([]);
    expect(findOverlaps(list, iso('2026-11-08T00:00:00Z'), iso('2026-11-08T01:00:00Z'))).toEqual([]);
  });
  it('skips the Entry being edited', () => {
    expect(findOverlaps(list, iso('2026-11-08T01:15:00Z'), iso('2026-11-08T01:45:00Z'), '1')).toEqual([]);
  });
});
