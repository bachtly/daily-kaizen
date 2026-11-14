import type { Id, Role, WeekFacts } from "../_shared/facts.ts";

export const KINDS = [
  "waste_window",
  "fragmented_deep",
  "focus_length",
  "scattered_shallow",
  "target_gap",
  "sleep_short",
  "late_work",
  "squeezed_recovery",
  "maintenance_drift",
] as const;
export type Kind = (typeof KINDS)[number];

/** How to measure an insight in any week (design §3 `metric`). */
export type Metric =
  | { fn: "category_minutes_in_hours"; roles: Role[]; hours: number[]; better: "lower" }
  | { fn: "deep_short_block_minutes"; under: number; better: "lower" }
  | { fn: "deep_waste_share"; better: "lower" }
  | { fn: "short_entries"; activity_id: Id; better: "lower" }
  | { fn: "target_actual"; activity_id: Id; category_id: Id | null; better: "lower" | "higher" }
  | { fn: "short_nights"; under: number; better: "lower" }
  | { fn: "days_recovery_under"; under: number; better: "lower" }
  | { fn: "category_minutes"; role: Role; better: "toward"; target: number }
  /** an ad-hoc card: nothing code can measure, so it can't be a change */
  | { fn: "none" };

/** A detector's output: the numbers a card may show, as display strings (design §7 validation). */
export type Candidate = {
  kind: Kind;
  subjectKey: string;
  stakeMin: number;
  facts: Record<string, string>;
  entryIds: Id[];
  metric: Metric;
  evidenceIds: string[];
};

export type Target = { id: Id; activity_id: Id; category_id: Id | null; minutes: number };

export type DetectContext = {
  current: WeekFacts;
  /** entry ids per piece of owned time this week */
  pieces: { start: number; end: number; entryId: Id; cat: Id; acts: readonly Id[] }[];
  /** earlier weeks, newest first */
  history: WeekFacts[];
  roles: Partial<Record<Role, Id>>;
  activityNames: Record<Id, string>;
  categoryNames: Record<Id, string>;
  targets: Target[];
  quietStart: string;
};

/** One past insight, for ranking (design §6). */
export type PastInsight = {
  week_start: string;
  kind: string;
  subject_key: string;
  status: "new" | "accepted" | "dismissed";
  active_until: string | null;
  verdict: Verdict | null;
};

export type Verdict = "helped" | "unclear" | "worse" | "too_few_weeks";

export type CardText = { finding: string; detail: string; try_this: string };
