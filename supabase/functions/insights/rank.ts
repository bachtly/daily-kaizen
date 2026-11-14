// Ranking and adaptation (design §6): score = stake × w(kind) × fresh. A dismissal is an order:
// that (kind, subject) is not generated for 8 weeks. Ignored 3 weeks in a row pauses it for 4.
import type { Candidate, PastInsight } from "./types.ts";

export const MAX_CARDS = 8;
export const WEIGHT_WEEKS = 26;
export const DISMISS_WEEKS = 8;
export const PAUSE_WEEKS = 4;

export const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
const weeksBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / (7 * 86_400_000));

/** 2 × Beta(2,2) posterior mean of "useful": starts at 1.0, between 0 and 2. */
export function weight(kind: string, past: PastInsight[], week: string): number {
  let a = 0;
  let d = 0;
  for (const p of past) {
    if (p.kind !== kind || p.week_start >= week || weeksBetween(p.week_start, week) > WEIGHT_WEEKS) continue;
    if (p.status === "accepted") a++;
    if (p.status === "dismissed") d++;
    if (p.verdict === "helped") a++;
    if (p.verdict === "worse") d++;
  }
  return (2 * (a + 2)) / (a + d + 4);
}

const keyOf = (kind: string, subject: string) => `${kind}|${subject}`;

/** Why a candidate is left out this week, or null. */
export function excluded(c: Candidate, past: PastInsight[], week: string): string | null {
  const mine = past.filter((p) => keyOf(p.kind, p.subject_key) === keyOf(c.kind, c.subjectKey) && p.week_start < week);
  if (mine.some((p) => p.status === "dismissed" && weeksBetween(p.week_start, week) <= DISMISS_WEEKS)) return "dismissed";
  if (mine.some((p) => p.status === "accepted" && p.active_until !== null && p.active_until >= week)) return "running";
  const ignored = new Set(mine.filter((p) => p.status === "new").map((p) => p.week_start));
  for (let k = 1; k <= PAUSE_WEEKS; k++) {
    const end = addDays(week, -7 * k);
    if ([0, 1, 2].every((j) => ignored.has(addDays(end, -7 * j)))) return "paused";
  }
  return null;
}

/** 1.0, or 0.5 when shown in each of the last 2 weeks and I did nothing. */
export function freshness(c: Candidate, past: PastInsight[], week: string): number {
  const ignored = new Set(
    past.filter((p) => p.kind === c.kind && p.subject_key === c.subjectKey && p.status === "new").map((p) => p.week_start),
  );
  return ignored.has(addDays(week, -7)) && ignored.has(addDays(week, -14)) ? 0.5 : 1;
}

export type Ranked = Candidate & { score: number; rank: number };

/** Up to 8 candidates by score, best first; one per kind (detectors already return one). */
export function rank(cands: Candidate[], past: PastInsight[], week: string): Ranked[] {
  return cands
    .filter((c) => excluded(c, past, week) === null)
    .map((c) => ({ ...c, score: c.stakeMin * weight(c.kind, past, week) * freshness(c, past, week) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.kind.localeCompare(b.kind))
    .slice(0, MAX_CARDS)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}
