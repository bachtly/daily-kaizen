// The week's own data for the AI's ad-hoc findings: a timeline per day and plain totals, every number
// already computed, so the AI can spot patterns the fixed detectors don't look for and still only quote
// numbers that are here. Category and Activity names only, never Entry text.
import { GAP_MS, type Id, type Piece, UNTAGGED, type WeekFacts } from "../_shared/facts.ts";
import { zonedParts } from "../_shared/week.ts";
import { clock, DAY_NAMES, fmtH } from "./metrics.ts";

export type WeekData = {
  /** one line per day: logged or not, minutes per Category, unlogged, switches, sleep */
  days: string[];
  /** one line per hour of the day with time, summed over the week */
  hours_of_day: string[];
  activities: string[];
  deep_blocks: string[];
  /** what I did when, merged runs of the same Category and Activities; refs back the AI's findings */
  timeline: { ref: string; line: string }[];
};

const pad = (n: number) => String(n).padStart(2, "0");
const dur = (min: number) => (min < 60 ? `${min} min` : fmtH(min));
const top = (byId: Record<Id, number>, name: (id: Id) => string) =>
  Object.entries(byId).filter(([, m]) => m > 0).sort((a, b) => b[1] - a[1]).map(([id, m]) => `${name(id)} ${fmtH(m)}`)
    .join(", ");

export function weekData(
  f: WeekFacts,
  pieces: readonly Piece[],
  catName: Record<Id, string>,
  actName: Record<Id, string>,
): { data: WeekData; entriesByRef: Map<string, Id[]> } {
  const cat = (id: Id) => (id === UNTAGGED ? "Untagged" : catName[id] ?? "a Category");
  const act = (id: Id) => actName[id] ?? "an Activity";
  const [y, m, d] = f.weekStart.split("-").map(Number);
  const dayOf = (t: number) => {
    const p = zonedParts(t, f.tz);
    return { day: Math.round((Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(y, m - 1, d)) / 86_400_000), at: `${pad(p.hour)}:${pad(p.minute)}` };
  };

  const days = f.days.map((day, i) => {
    const byCat: Record<Id, number> = {};
    let switches = 0;
    for (const c of f.hours.slice(i * 24, i * 24 + 24)) {
      for (const [id, min] of Object.entries(c.cat)) byCat[id] = (byCat[id] ?? 0) + min;
      switches += c.switches;
    }
    const night = f.nights.find((n) => n.date === day.date);
    return [
      `${DAY_NAMES[i]} ${day.date}`,
      day.logged ? "logged" : day.elapsed ? "not logged" : "not over yet",
      top(byCat, cat) || "nothing logged",
      `unlogged outside Quiet hours ${fmtH(day.unloggedOutsideQuiet)}`,
      `switches ${switches}`,
      ...(night ? [`sleep that night ${fmtH(night.sleepMin)}`] : []),
    ].join(" | ");
  });

  const hours_of_day: string[] = [];
  for (let h = 0; h < 24; h++) {
    const byCat: Record<Id, number> = {};
    let switches = 0;
    for (let i = 0; i < 7; i++) {
      const c = f.hours[i * 24 + h];
      if (!c) continue;
      for (const [id, min] of Object.entries(c.cat)) byCat[id] = (byCat[id] ?? 0) + min;
      switches += c.switches;
    }
    const line = top(byCat, cat);
    if (line) hours_of_day.push(`${clock(h)} | ${line} | switches ${switches}`);
  }

  const activities = Object.entries(f.byActivity).filter(([, r]) => r.total > 0).sort((a, b) => b[1].total - a[1].total)
    .map(([id, r]) => `${act(id)} | ${fmtH(r.total)} | ${top(r.byCategory, cat)}`);

  const deep_blocks = f.deepBlocks.map((b) => {
    const s = dayOf(Date.parse(b.start));
    const next = b.next === "waste" ? `, then Waste ${dur(b.wasteAfterMin)}` : "";
    return `${DAY_NAMES[s.day] ?? ""} ${s.at} | ${dur(b.min)}${b.activityIds.length ? ` | ${b.activityIds.map(act).join(", ")}` : ""}${next}`;
  });

  // Runs of the same Category and Activities, back to back (gaps ≤ 5 min).
  const runs: { start: number; end: number; cat: Id; acts: string; entries: Set<Id> }[] = [];
  for (const p of [...pieces].sort((a, b) => a.start - b.start)) {
    const acts = [...p.acts].sort().join(",");
    const last = runs.at(-1);
    if (last && p.start - last.end <= GAP_MS && last.cat === p.cat && last.acts === acts) {
      last.end = Math.max(last.end, p.end);
      last.entries.add(p.entryId);
    } else runs.push({ start: p.start, end: p.end, cat: p.cat, acts, entries: new Set([p.entryId]) });
  }
  const entriesByRef = new Map<string, Id[]>();
  const timeline = runs.map((r, i) => {
    const ref = `r${i + 1}`;
    entriesByRef.set(ref, [...r.entries]);
    const s = dayOf(r.start);
    const e = dayOf(r.end);
    const names = r.acts ? ` · ${r.acts.split(",").map(act).join(", ")}` : "";
    return { ref, line: `${DAY_NAMES[s.day] ?? ""} ${s.at}-${e.at} ${cat(r.cat)}${names} (${dur(Math.round((r.end - r.start) / 60_000))})` };
  });

  return { data: { days, hours_of_day, activities, deep_blocks, timeline }, entriesByRef };
}

/** Every text in the data a number may be copied from (refs left out). */
export const dataTexts = (w: WeekData) => [...w.days, ...w.hours_of_day, ...w.activities, ...w.deep_blocks, ...w.timeline.map((t) => t.line)];
