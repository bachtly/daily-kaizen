// Insights (#80) on the phone: week facts for the heatmap, and what the Week page shows from the cards.
import type { CategoryRow, EntryRow, InsightRow, SettingsRow, SummaryRow } from './db';
import { computeWeek, rolesOf, type WeekFacts } from './facts';

export const MIN_LOGGED_DAYS = 5;
export const SHOWN_FIRST = 3;

/** This week's facts from the Entries on the phone (same rules as the Server). */
export function phoneFacts(
  entries: readonly EntryRow[],
  monday: string,
  tz: string,
  now: number,
  categories: readonly CategoryRow[],
  settings: Pick<SettingsRow, 'quiet_start' | 'quiet_end'> | null,
): WeekFacts {
  return computeWeek({
    entries: entries.map((e) => ({ ...e, activity_ids: e.activity_ids ?? [] })),
    weekStart: monday,
    tz,
    now,
    roles: rolesOf(categories),
    quietStart: settings?.quiet_start ?? '23:00',
    quietEnd: settings?.quiet_end ?? '07:00',
  }).facts;
}

/** The week's cards I haven't dismissed, in rank order. */
export const cardsOf = (insights: readonly InsightRow[], monday: string) =>
  insights.filter((i) => i.week_start === monday && i.status !== 'dismissed').sort((a, b) => a.rank - b.rank);

/** The accepted card of an earlier week whose change runs in (or ended with) the week shown. */
export function changeFor(insights: readonly InsightRow[], monday: string): InsightRow | null {
  return insights
    .filter((i) => i.status === 'accepted' && i.active_until !== null && i.week_start < monday && i.active_until >= shiftWeek(monday, -1))
    .sort((a, b) => b.week_start.localeCompare(a.week_start))[0] ?? null;
}

export const shiftWeek = (monday: string, weeks: number) => {
  const [y, m, d] = monday.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 7 * weeks)).toISOString().slice(0, 10);
};

export type ChangeResult = {
  baseline: number[];
  after: number[];
  unit: 'min' | 'count' | 'percent';
  verdict: 'helped' | 'unclear' | 'worse' | 'too_few_weeks';
  final: boolean;
};

const VERDICT: Record<ChangeResult['verdict'], string> = {
  helped: 'Helped',
  unclear: 'No clear change',
  worse: 'Worse than usual',
  too_few_weeks: 'Too few usual weeks to tell',
};

/** "Usual 5h–7h → 2h · Helped" (hours one decimal, counts, percents). */
export function resultLine(r: ChangeResult): string {
  const f = (v: number) => (r.unit === 'min' ? `${Math.round(v / 6) / 10}h` : r.unit === 'percent' ? `${v}%` : String(v));
  const lo = Math.min(...r.baseline);
  const hi = Math.max(...r.baseline);
  const usual = r.baseline.length ? `Usual ${lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`} → ` : '';
  return `${usual}${r.after.map(f).join(', ')} · ${VERDICT[r.verdict]}`;
}

/** Facts of the weeks in the trend, oldest first: up to `weeks` Server summaries before this week, then this week. */
export function trendWeeks(summaries: readonly SummaryRow[], current: WeekFacts, weeks = 7): WeekFacts[] {
  const past = summaries
    .map((s) => s.facts as unknown as WeekFacts)
    .filter((f) => f && f.weekStart < current.weekStart)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-weeks);
  return [...past, current];
}
