// The 9 detectors (design §5). Each returns at most one candidate a week, its biggest subject.
// Thresholds are named constants; tests cover their edges.
import { zonedParts } from "../_shared/week.ts";
import { spanCells } from "../_shared/facts.ts";
import { cellMinutes, clock, DAY_NAMES, fmtH, median, usual } from "./metrics.ts";
import type { Candidate, DetectContext, Kind } from "./types.ts";

export const T = {
  wasteMinMin: 180, // Waste ≥ 3 h
  wasteWindowShare: 0.5,
  wasteSubjectShare: 0.5,
  manySwitches: 3,
  manySwitchHours: 2,
  shortBlockMin: 20,
  shortBlocks: 4,
  focusBlocks: 12,
  focusWeeks: 4,
  focusBandMin: 3,
  focusGap: 0.3,
  shortEntries: 10,
  shortDays: 4,
  shortNearDeep: 2,
  targetGapMin: 60,
  targetGapShare: 0.2,
  sleepMin: 420,
  shortNights: 3,
  lateWindowMin: 120,
  lateDayMin: 15,
  lateDays: 2,
  recoveryAwakeMin: 120,
  squeezedDays: 3,
  maintenanceHigh: 1.5,
  maintenanceLow: 0.5,
  maintenanceDiffMin: 180,
  maintenanceWeeks: 4,
} as const;

export const EVIDENCE_FOR: Record<Kind, string[]> = {
  waste_window: ["if-then-plans"],
  fragmented_deep: ["attention-residue"],
  focus_length: ["break-timing"],
  scattered_shallow: ["email-batching"],
  target_gap: ["progress-monitoring"],
  sleep_short: ["sleep-duration"],
  late_work: ["detachment"],
  squeezed_recovery: ["free-time"],
  maintenance_drift: ["atus-reference"],
};

const HOUR = 3_600_000;
const pct = (x: number) => `${Math.round(100 * x)}%`;
const uniq = <T>(xs: T[]) => [...new Set(xs)];

/** Minutes of [s, e) inside the given local hours of the day. */
function minutesInHours(s: number, e: number, tz: string, hours: number[]): number {
  let sum = 0;
  for (let t = s; t < e;) {
    const p = zonedParts(t, tz);
    const next = t + ((60 - p.minute) * 60 - p.second) * 1000 - (((t % 1000) + 1000) % 1000);
    const n = Math.min(e, next > t ? next : t + HOUR);
    if (hours.includes(p.hour)) sum += n - t;
    t = n;
  }
  return sum / 60_000;
}

export function wasteWindow(x: DetectContext): Candidate | null {
  const waste = x.roles.waste;
  if (!waste) return null;
  const total = cellMinutes(x.current, [waste]);
  if (total < T.wasteMinMin) return null;
  // The window with the most Waste; on a tie, the one whose first hour has the most (it starts where the Waste does).
  let best = -1;
  let first = -1;
  let h0 = 0;
  for (let h = 0; h < 24; h++) {
    const m = cellMinutes(x.current, [waste], 168, [h, (h + 1) % 24, (h + 2) % 24]);
    const f = cellMinutes(x.current, [waste], 168, [h]);
    if (m > best || (m === best && f > first)) [best, first, h0] = [m, f, h];
  }
  if (best / total < T.wasteWindowShare) return null;
  const hours = [h0, (h0 + 1) % 24, (h0 + 2) % 24];
  const byAct: Record<string, number> = {};
  const ids: string[] = [];
  for (const p of x.pieces) {
    if (p.cat !== waste) continue;
    const m = minutesInHours(p.start, p.end, x.current.tz, hours);
    if (m <= 0) continue;
    ids.push(p.entryId);
    for (const a of p.acts) byAct[a] = (byAct[a] ?? 0) + m / p.acts.length;
  }
  const top = Object.entries(byAct).sort((a, b) => b[1] - a[1])[0];
  const subject = top && top[1] / best >= T.wasteSubjectShare ? top[0] : null;
  return {
    kind: "waste_window",
    subjectKey: subject ? `activity:${subject}` : "",
    stakeMin: best,
    facts: {
      waste_total: fmtH(total),
      window_total: fmtH(best),
      from: clock(h0),
      to: clock(h0 + 3),
      share: pct(best / total),
      ...(subject ? { activity: x.activityNames[subject] ?? "an Activity" } : {}),
    },
    entryIds: uniq(ids),
    metric: { fn: "category_minutes_in_hours", roles: ["waste"], hours, better: "lower" },
    evidenceIds: EVIDENCE_FOR.waste_window,
  };
}

export function fragmentedDeep(x: DetectContext): Candidate | null {
  const deep = x.roles.deep;
  if (!deep) return null;
  const many: number[] = [];
  x.current.hours.forEach((c, i) => {
    if (c.switches >= T.manySwitches && (c.cat[deep] ?? 0) > 0) many.push(i);
  });
  const short = x.current.deepBlocks.filter((b) => b.min < T.shortBlockMin);
  if (many.length < T.manySwitchHours || short.length < T.shortBlocks) return null;
  const stake = short.reduce((a, b) => a + b.min, 0);
  const busiest = many.reduce((a, b) => (x.current.hours[b].switches > x.current.hours[a].switches ? b : a));
  const ids = x.pieces.filter((p) => {
    const l = zonedParts(p.start, x.current.tz);
    const [y, m, d] = x.current.weekStart.split("-").map(Number);
    const day = Math.round((Date.UTC(l.year, l.month - 1, l.day) - Date.UTC(y, m - 1, d)) / 86_400_000);
    return many.includes(day * 24 + l.hour);
  }).map((p) => p.entryId);
  return {
    kind: "fragmented_deep",
    subjectKey: "",
    stakeMin: stake,
    facts: {
      switch_hours: String(many.length),
      short_blocks: String(short.length),
      short_deep: fmtH(stake),
      busiest: `${DAY_NAMES[Math.floor(busiest / 24)]} ${clock(busiest % 24)}`,
      busiest_switches: String(x.current.hours[busiest].switches),
    },
    entryIds: uniq(ids),
    metric: { fn: "deep_short_block_minutes", under: T.shortBlockMin, better: "lower" },
    evidenceIds: EVIDENCE_FOR.fragmented_deep,
  };
}

const BANDS: { lo: number; hi: number; label: string; mid: number }[] = [
  { lo: 0, hi: 30, label: "under 30 min", mid: 20 },
  { lo: 30, hi: 60, label: "30–60 min", mid: 45 },
  { lo: 60, hi: 90, label: "60–90 min", mid: 75 },
  { lo: 90, hi: 120, label: "90–120 min", mid: 105 },
  { lo: 120, hi: Infinity, label: "2h or more", mid: 120 },
];

export function focusLength(x: DetectContext): Candidate | null {
  const weeks = [x.current, ...x.history.slice(0, T.focusWeeks - 1)];
  const blocks = weeks.flatMap((w) => w.deepBlocks);
  if (blocks.length < T.focusBlocks) return null;
  const bands = BANDS.map((b) => {
    const inBand = blocks.filter((k) => k.min >= b.lo && k.min < b.hi);
    const waste = inBand.filter((k) => k.next === "waste");
    return { ...b, n: inBand.length, waste: waste.length, wasteMin: waste.reduce((a, k) => a + k.wasteAfterMin, 0) };
  }).filter((b) => b.n >= T.focusBandMin);
  if (bands.length < 2) return null;
  const rate = (b: (typeof bands)[number]) => b.waste / b.n;
  const best = bands.reduce((a, b) => (rate(b) < rate(a) ? b : a));
  const worst = bands.reduce((a, b) => (rate(b) > rate(a) ? b : a));
  if (rate(worst) - rate(best) < T.focusGap) return null;
  const deep = x.roles.deep;
  return {
    kind: "focus_length",
    subjectKey: "",
    stakeMin: worst.wasteMin / weeks.length,
    facts: {
      weeks: String(weeks.length),
      best_band: best.label,
      best_blocks: String(best.n),
      best_waste: String(best.waste),
      best_minutes: `${best.mid} min`,
      worst_band: worst.label,
      worst_blocks: String(worst.n),
      worst_waste: String(worst.waste),
    },
    entryIds: uniq(x.pieces.filter((p) => p.cat === deep).map((p) => p.entryId)),
    metric: { fn: "deep_waste_share", better: "lower" },
    evidenceIds: EVIDENCE_FOR.focus_length,
  };
}

export function scatteredShallow(x: DetectContext): Candidate | null {
  const top = Object.entries(x.current.shortEntries)
    .filter(([, s]) => s.count >= T.shortEntries && s.days >= T.shortDays && s.nearDeep >= T.shortNearDeep)
    .sort((a, b) => b[1].count - a[1].count)[0];
  if (!top) return null;
  const [act, s] = top;
  const totals = new Map<string, number>();
  for (const p of x.pieces) totals.set(p.entryId, (totals.get(p.entryId) ?? 0) + (p.end - p.start));
  const ids = x.pieces.filter((p) =>
    p.cat === x.roles.shallow && p.acts.includes(act) && (totals.get(p.entryId) ?? 0) < 15 * 60_000
  ).map((p) => p.entryId);
  return {
    kind: "scattered_shallow",
    subjectKey: `activity:${act}`,
    stakeMin: s.count * s.medianMin,
    facts: {
      activity: x.activityNames[act] ?? "an Activity",
      count: String(s.count),
      median: `${s.medianMin} min`,
      days: String(s.days),
      near_deep: String(s.nearDeep),
    },
    entryIds: uniq(ids),
    metric: { fn: "short_entries", activity_id: act, better: "lower" },
    evidenceIds: EVIDENCE_FOR.scattered_shallow,
  };
}

/** Before Sunday 18:00 (the weekly run) the week is "so far": totals aren't final yet. */
export const weekSoFar = (f: Parameters<typeof spanCells>[0]) => spanCells(f) < 6 * 24 + 18;

export function targetGap(x: DetectContext): Candidate | null {
  // Mid-week a target isn't missed yet; a ceiling already passed is.
  const ended = !weekSoFar(x.current);
  let best: Candidate | null = null;
  for (const t of x.targets) {
    const row = x.current.byActivity[t.activity_id];
    const actual = row ? (t.category_id ? row.byCategory[t.category_id] ?? 0 : row.total) : 0;
    const ceiling = t.category_id !== null && t.category_id === x.roles.waste;
    if (!ceiling && !ended) continue;
    const gap = ceiling ? actual - t.minutes : t.minutes - actual;
    if (gap < Math.max(T.targetGapMin, T.targetGapShare * t.minutes)) continue;
    if (best && best.stakeMin >= gap) continue;
    best = {
      kind: "target_gap",
      subjectKey: `target:${t.id}`,
      stakeMin: gap,
      facts: {
        activity: x.activityNames[t.activity_id] ?? "an Activity",
        ...(t.category_id ? { category: x.categoryNames[t.category_id] ?? "a Category" } : {}),
        actual: fmtH(actual),
        target: fmtH(t.minutes),
        gap: fmtH(gap),
        direction: ceiling ? "over" : "under",
      },
      entryIds: uniq(
        x.pieces.filter((p) => p.acts.includes(t.activity_id) && (!t.category_id || p.cat === t.category_id))
          .map((p) => p.entryId),
      ),
      metric: {
        fn: "target_actual",
        activity_id: t.activity_id,
        category_id: t.category_id,
        better: ceiling ? "lower" : "higher",
      },
      evidenceIds: EVIDENCE_FOR.target_gap,
    };
  }
  return best;
}

export function sleepShort(x: DetectContext): Candidate | null {
  const nights = x.current.nights;
  const short = nights.filter((n) => n.sleepMin < T.sleepMin);
  if (short.length < T.shortNights) return null;
  const shortfall = short.reduce((a, n) => a + (T.sleepMin - n.sleepMin), 0);
  return {
    kind: "sleep_short",
    subjectKey: "",
    stakeMin: shortfall,
    facts: {
      short_nights: String(short.length),
      nights: String(nights.length),
      median_sleep: fmtH(median(nights.map((n) => n.sleepMin))),
      shortfall: fmtH(shortfall),
      under: fmtH(T.sleepMin),
    },
    entryIds: uniq(
      x.pieces.filter((p) => p.cat === x.roles.recovery && p.end - p.start >= 60 * 60_000).map((p) => p.entryId),
    ),
    metric: { fn: "short_nights", under: T.sleepMin, better: "lower" },
    evidenceIds: EVIDENCE_FOR.sleep_short,
  };
}

/** Hours of the day covered at least half by the 2 h before Quiet hours start (wraps midnight). */
export function lateHours(quietStart: string): number[] {
  const [h, m] = quietStart.split(":").map(Number);
  const qs = h * 60 + (m || 0);
  const ws = (qs - T.lateWindowMin + 1440) % 1440;
  const window = ws < qs ? [[ws, qs]] : [[ws, 1440], [0, qs]];
  const out: number[] = [];
  for (let k = 0; k < 24; k++) {
    let inside = 0;
    for (const [a, b] of window) inside += Math.max(0, Math.min(b, k * 60 + 60) - Math.max(a, k * 60));
    if (inside >= 30) out.push(k);
  }
  return out;
}

export function lateWork(x: DetectContext): Candidate | null {
  const work = [x.roles.deep, x.roles.shallow];
  if (!work.some(Boolean)) return null;
  const hours = lateHours(x.quietStart);
  let total = 0;
  let days = 0;
  for (let d = 0; d < 7; d++) {
    let m = 0;
    for (const h of hours) for (const id of work) if (id) m += x.current.hours[d * 24 + h].cat[id] ?? 0;
    total += m;
    if (m >= T.lateDayMin) days++;
  }
  if (days < T.lateDays) return null;
  const ids = x.pieces.filter((p) => work.includes(p.cat) && minutesInHours(p.start, p.end, x.current.tz, hours) > 0)
    .map((p) => p.entryId);
  return {
    kind: "late_work",
    subjectKey: "",
    stakeMin: total,
    facts: {
      days: String(days),
      work: fmtH(total),
      from: clock(hours[0] ?? 21),
      quiet_start: x.quietStart.slice(0, 5),
    },
    entryIds: uniq(ids),
    metric: { fn: "category_minutes_in_hours", roles: ["deep", "shallow"], hours, better: "lower" },
    evidenceIds: EVIDENCE_FOR.late_work,
  };
}

export function squeezedRecovery(x: DetectContext): Candidate | null {
  if (!x.roles.recovery) return null;
  const logged = x.current.days.filter((d) => d.logged);
  const under = logged.filter((d) => d.recoveryAwake < T.recoveryAwakeMin);
  if (under.length < T.squeezedDays) return null;
  const shortfall = under.reduce((a, d) => a + (T.recoveryAwakeMin - d.recoveryAwake), 0);
  return {
    kind: "squeezed_recovery",
    subjectKey: "",
    stakeMin: shortfall,
    facts: {
      days_under: String(under.length),
      logged_days: String(logged.length),
      median_recovery: fmtH(median(logged.map((d) => d.recoveryAwake))),
      under: fmtH(T.recoveryAwakeMin),
    },
    entryIds: uniq(
      x.pieces.filter((p) => p.cat === x.roles.recovery && p.end - p.start < 3 * 60 * 60_000).map((p) => p.entryId),
    ),
    metric: { fn: "days_recovery_under", under: T.recoveryAwakeMin, better: "lower" },
    evidenceIds: EVIDENCE_FOR.squeezed_recovery,
  };
}

export function maintenanceDrift(x: DetectContext): Candidate | null {
  const maint = x.roles.maintenance;
  if (!maint) return null;
  const span = spanCells(x.current);
  const now = cellMinutes(x.current, [maint], span);
  const u = usual(x.history, (f) => cellMinutes(f, [maint], span));
  const full = usual(x.history, (f) => cellMinutes(f, [maint]));
  if (!u || !full || u.weeks < T.maintenanceWeeks || u.median <= 0) return null;
  const ratio = now / u.median;
  const diff = Math.abs(now - u.median);
  if ((ratio < T.maintenanceHigh && ratio > T.maintenanceLow) || diff < T.maintenanceDiffMin) return null;
  return {
    kind: "maintenance_drift",
    subjectKey: "",
    stakeMin: diff,
    facts: {
      now: fmtH(now),
      usual: fmtH(u.median),
      usual_lo: fmtH(u.lo),
      usual_hi: fmtH(u.hi),
      direction: ratio >= T.maintenanceHigh ? "more" : "less",
    },
    entryIds: uniq(x.pieces.filter((p) => p.cat === maint).map((p) => p.entryId)),
    metric: { fn: "category_minutes", role: "maintenance", better: "toward", target: full.median },
    evidenceIds: EVIDENCE_FOR.maintenance_drift,
  };
}

export const DETECTORS = [
  wasteWindow,
  fragmentedDeep,
  focusLength,
  scatteredShallow,
  targetGap,
  sleepShort,
  lateWork,
  squeezedRecovery,
  maintenanceDrift,
];

export function detectAll(x: DetectContext): Candidate[] {
  return DETECTORS.map((d) => d(x)).filter((c): c is Candidate => c !== null);
}
