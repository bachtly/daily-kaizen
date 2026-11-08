import type { Database } from './database.types';
import { startOfDay } from './week';

type Entry = Database['public']['Tables']['entries']['Row'];

export const RECENT_COUNT = 5;

/** AC-1.1: start = latest end in the Local copy, else the start of today in `tz`; end = now. All in ms. */
export function prefill(
  entries: readonly Pick<Entry, 'ended_at'>[],
  now: number,
  tz: string,
): { start: number; end: number } {
  let latest = -Infinity;
  for (const e of entries) latest = Math.max(latest, Date.parse(e.ended_at));
  return { start: Number.isFinite(latest) ? latest : startOfDay(now, tz), end: now };
}

/** The 5 most recent distinct texts, newest first (by created_at). Distinct after trimming. */
export function recentTexts(entries: readonly Pick<Entry, 'text' | 'created_at'>[], count = RECENT_COUNT): string[] {
  const sorted = [...entries].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of sorted) {
    const t = e.text.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length === count) break;
  }
  return out;
}

/** Entries that share time with [start, end), skipping the Entry being edited. Touching ends don't overlap. */
export function findOverlaps<T extends Pick<Entry, 'id' | 'started_at' | 'ended_at'>>(
  entries: readonly T[],
  start: number,
  end: number,
  editingId?: string,
): T[] {
  return entries.filter(
    (e) => e.id !== editingId && Date.parse(e.started_at) < end && Date.parse(e.ended_at) > start,
  );
}
