// Change results (design §8): the running weeks against my usual weeks, by non-overlap.
// Helped only when the median of the change weeks beats every baseline week, so a rebound after a bad
// week (regression to the mean) doesn't count as a win.
import type { Id, Role, WeekFacts } from "../_shared/facts.ts";
import { badness, ELIGIBLE_LOGGED_DAYS, measure, median } from "./metrics.ts";
import { addDays } from "./rank.ts";
import type { Metric, Verdict } from "./types.ts";

export const BASELINE_WEEKS = 4;
export const BASELINE_MIN = 3;

export type Unit = "min" | "count" | "percent";
export const unitOf = (m: Metric): Unit =>
  m.fn === "deep_waste_share"
    ? "percent"
    : ["short_entries", "short_nights", "days_recovery_under"].includes(m.fn)
    ? "count"
    : "min";

export type ChangeResult = {
  baseline: number[];
  after: number[];
  unit: Unit;
  verdict: Verdict;
  /** the run has ended */
  final: boolean;
  evaluated_at: string;
};

/**
 * `weeks`: summaries by week_start, full weeks only. `justEnded`: the Monday of the week that just ended.
 * Returns null while no week of the run has ended.
 */
export function evaluate(
  ins: { week_start: string; active_until: string; metric: Metric },
  weeks: Map<string, WeekFacts>,
  roles: Partial<Record<Role, Id>>,
  justEnded: string,
  now: Date,
): ChangeResult | null {
  const after: number[] = [];
  for (let w = addDays(ins.week_start, 7); w <= ins.active_until && w <= justEnded; w = addDays(w, 7)) {
    const f = weeks.get(w);
    if (f) after.push(measure(ins.metric, f, roles));
  }
  if (!after.length) return null;
  const baseline = [...weeks.values()]
    .filter((f) => f.weekStart <= ins.week_start && f.loggedDays >= ELIGIBLE_LOGGED_DAYS)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, BASELINE_WEEKS)
    .map((f) => measure(ins.metric, f, roles));
  let verdict: Verdict;
  if (baseline.length < BASELINE_MIN) verdict = "too_few_weeks";
  else {
    const a = badness(ins.metric, median(after));
    const b = baseline.map((v) => badness(ins.metric, v));
    verdict = a < Math.min(...b) ? "helped" : a > Math.max(...b) ? "worse" : "unclear";
  }
  return {
    baseline,
    after,
    unit: unitOf(ins.metric),
    verdict,
    final: justEnded >= ins.active_until,
    evaluated_at: now.toISOString(),
  };
}
