import { db } from './db';

export const MAX_TIMINGS = 50;
export type TimingKind = 'refresh' | 'save';

const key = (kind: TimingKind) => `timings:${kind}`;

/** Keep the last 50 durations (ms) of a kind. Stored in the meta table, which a refresh never clears. */
export async function recordTiming(kind: TimingKind, ms: number): Promise<void> {
  await db.transaction('rw', db.meta, async () => {
    const row = await db.meta.get(key(kind));
    const list = ((row?.value as number[] | undefined) ?? []).concat(Math.round(ms));
    await db.meta.put({ key: key(kind), value: list.slice(-MAX_TIMINGS) });
  });
}

export async function getTimings(kind: TimingKind): Promise<number[]> {
  return ((await db.meta.get(key(kind)))?.value as number[] | undefined) ?? [];
}

/** Nearest-rank 95th percentile; null when there are no samples. */
export function p95(samples: readonly number[]): number | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.ceil(0.95 * sorted.length) - 1];
}
