// Week facts for Insights (#80, design §4). Pure TypeScript shared by the insights Edge Function and the
// phone (heatmap). All "local" times are in the week's time zone. Minutes are rounded once, at the end.
import {
  ownedPieces,
  startOfZonedDay,
  type WeekEntry,
  weekBounds,
  zonedParts,
} from "./week.ts";

export type Id = string;
/** An Entry with its Activities (0 to 3). */
export type FactsEntry = WeekEntry & { activity_ids: readonly Id[] };
/** Category ids by their role, matched by name: Deep, Shallow, Maintenance, Recovery, Waste. */
export type Roles = Partial<Record<Role, Id>>;
export type Role = "deep" | "shallow" | "maintenance" | "recovery" | "waste";
export const ROLE_NAMES: Record<Role, string> = {
  deep: "deep",
  shallow: "shallow",
  maintenance: "maintenance",
  recovery: "recovery",
  waste: "waste",
};
export const UNTAGGED = "untagged";

/** Roles from a user's Categories (any status), by name, ignoring case. */
export function rolesOf(categories: readonly { id: Id; name: string }[]): Roles {
  const out: Roles = {};
  for (const c of categories) {
    const r = (Object.keys(ROLE_NAMES) as Role[]).find((k) => ROLE_NAMES[k] === c.name.trim().toLowerCase());
    if (r && !out[r]) out[r] = c.id;
  }
  return out;
}

export type Cell = {
  /** minutes per Category id (or UNTAGGED) */
  cat: Record<Id, number>;
  /** minutes per Activity id, an Entry's time split equally among its Activities */
  act: Record<Id, number>;
  switches: number;
};
export type DayFacts = {
  date: string;
  /** the whole day is in the past */
  elapsed: boolean;
  unloggedOutsideQuiet: number;
  /** Recovery other than sleep */
  recoveryAwake: number;
  logged: boolean;
};
export type Night = { date: string; sleepMin: number };
export type DeepBlock = {
  start: string;
  min: number;
  activityIds: Id[];
  /** what starts within 15 min after the block */
  next: "waste" | "other" | "none";
  /** Waste right after the block (gaps ≤ 5 min), up to 60 */
  wasteAfterMin: number;
};
export type ShortStat = { count: number; medianMin: number; days: number; nearDeep: number };

export type WeekFacts = {
  v: 1;
  weekStart: string;
  asOf: string;
  tz: string;
  loggedDays: number;
  minutes: { byCategory: Record<Id, number>; untagged: number; unlogged: number };
  byActivity: Record<Id, { total: number; byCategory: Record<Id, number> }>;
  /** 168 cells, index = day * 24 + local hour */
  hours: Cell[];
  days: DayFacts[];
  nights: Night[];
  deepBlocks: DeepBlock[];
  /** Shallow Entries under 15 min, per Activity */
  shortEntries: Record<Id, ShortStat>;
};

/** A piece of owned time, for detectors that need Entry ids. Not stored. */
export type Piece = { start: number; end: number; entryId: Id; cat: Id; acts: readonly Id[] };

export type WeekInput = {
  entries: readonly FactsEntry[];
  weekStart: string;
  tz: string;
  /** end of the span (past time only) */
  now: number;
  roles: Roles;
  /** Quiet hours, "HH:MM" or "HH:MM:SS" */
  quietStart: string;
  quietEnd: string;
};

export const GAP_MS = 5 * 60_000; // back-to-back
export const NEXT_MS = 15 * 60_000; // "followed by"
export const SHORT_MIN = 15;
export const SLEEP_MIN = 180;
export const LOGGED_DAY_MAX_UNLOGGED = 180;
const HOUR = 3_600_000;
const MIN = 60_000;

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (ms: number) => Math.round(ms / MIN);
const clockMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Fraction of local hour h (0-23) inside Quiet hours (wrap-aware, start inclusive). */
export function quietFraction(h: number, quietStart: string, quietEnd: string): number {
  const s = clockMin(quietStart);
  const e = clockMin(quietEnd);
  const ranges = s < e ? [[s, e]] : [[s, 1440], [0, e]];
  let inside = 0;
  for (const [a, b] of ranges) inside += Math.max(0, Math.min(b, h * 60 + 60) - Math.max(a, h * 60));
  return inside / 60;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function addTo(map: Record<Id, number>, k: Id, v: number) {
  map[k] = (map[k] ?? 0) + v;
}

/** Computes one week's facts and the owned pieces behind them. */
export function computeWeek(input: WeekInput): { facts: WeekFacts; pieces: Piece[] } {
  const { tz, roles } = input;
  const bounds = weekBounds(input.weekStart, tz);
  const winEnd = Math.min(bounds.end, input.now);
  const [my, mm, md] = input.weekStart.split("-").map(Number);
  const mondayUtc = Date.UTC(my, mm - 1, md);

  const local = (t: number) => {
    const p = zonedParts(t, tz);
    const day = Math.round((Date.UTC(p.year, p.month - 1, p.day) - mondayUtc) / 86_400_000);
    return { day, hour: p.hour, minute: p.minute, second: p.second };
  };
  const nextHour = (t: number) => {
    const p = zonedParts(t, tz);
    const n = t + ((60 - p.minute) * 60 - p.second) * 1000 - (((t % 1000) + 1000) % 1000);
    return n > t ? n : t + HOUR;
  };
  /** Splits [s, e) at local hour boundaries. */
  const eachHour = (s: number, e: number, f: (cell: number, ms: number) => void) => {
    for (let t = s; t < e;) {
      const n = Math.min(e, nextHour(t));
      const l = local(t);
      if (l.day >= 0 && l.day < 7) f(l.day * 24 + l.hour, n - t);
      t = n;
    }
  };

  const raw = ownedPieces(input.entries, bounds.start, winEnd);
  const pieces: Piece[] = raw.map((p) => ({
    start: p.start,
    end: p.end,
    entryId: p.entry.id,
    cat: p.entry.category_id ?? UNTAGGED,
    acts: p.entry.activity_ids,
  }));

  // Hour cells (ms while summing)
  const cat: Record<Id, number>[] = Array.from({ length: 168 }, () => ({}));
  const act: Record<Id, number>[] = Array.from({ length: 168 }, () => ({}));
  const switches = new Array<number>(168).fill(0);
  const elapsed = new Array<number>(168).fill(0);
  const covered = new Array<number>(168).fill(0);
  const sleepCell = new Array<number>(168).fill(0);
  eachHour(bounds.start, winEnd, (c, ms) => (elapsed[c] += ms));

  const byCategory: Record<Id, number> = {};
  const byActivity: Record<Id, { total: number; byCategory: Record<Id, number> }> = {};
  let untagged = 0;
  for (const p of pieces) {
    const ms = p.end - p.start;
    if (p.cat === UNTAGGED) untagged += ms;
    else addTo(byCategory, p.cat, ms);
    const share = p.acts.length ? ms / p.acts.length : 0;
    for (const a of p.acts) {
      const row = (byActivity[a] ??= { total: 0, byCategory: {} });
      row.total += share;
      addTo(row.byCategory, p.cat, share);
    }
    eachHour(p.start, p.end, (c, part) => {
      addTo(cat[c], p.cat, part);
      covered[c] += part;
      for (const a of p.acts) addTo(act[c], a, part / p.acts.length);
    });
  }

  // Switches: back-to-back pieces of different Entries with a different Category or Activity set
  const actKey = (p: Piece) => [...p.acts].sort().join(",");
  for (let i = 1; i < pieces.length; i++) {
    const p = pieces[i - 1];
    const q = pieces[i];
    if (q.entryId === p.entryId || q.start - p.end > GAP_MS) continue;
    if (q.cat === p.cat && actKey(q) === actKey(p)) continue;
    const l = local(q.start);
    if (l.day >= 0 && l.day < 7) switches[l.day * 24 + l.hour]++;
  }

  // Blocks of one Category with gaps ≤ 5 min
  const blocksOf = (role: Id | undefined) => {
    const out: { start: number; end: number; pieces: Piece[] }[] = [];
    if (!role) return out;
    for (const p of pieces) {
      if (p.cat !== role) continue;
      const last = out[out.length - 1];
      if (last && p.start - last.end <= GAP_MS) {
        last.end = p.end;
        last.pieces.push(p);
      } else out.push({ start: p.start, end: p.end, pieces: [p] });
    }
    return out;
  };

  // Sleep: a Recovery block of 3 h or more overlapping 02:00-05:00 local; counted for the evening it started
  const nights: Night[] = [];
  const dateOf = (t: number) => {
    const p = zonedParts(t, tz);
    return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  };
  const shiftDate = (date: string, days: number) => {
    const [y, m, d] = date.split("-").map(Number);
    const x = new Date(Date.UTC(y, m - 1, d + days));
    return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
  };
  for (const b of blocksOf(roles.recovery)) {
    if (b.end - b.start < SLEEP_MIN * MIN) continue;
    let isSleep = false;
    for (const date of [dateOf(b.start), shiftDate(dateOf(b.start), 1)]) {
      const [y, m, d] = date.split("-").map(Number);
      const day0 = startOfZonedDay(y, m, d, tz);
      if (b.start < day0 + 5 * HOUR && b.end > day0 + 2 * HOUR) isSleep = true;
    }
    if (!isSleep) continue;
    const startLocal = zonedParts(b.start, tz);
    const evening = startLocal.hour >= 12 ? dateOf(b.start) : shiftDate(dateOf(b.start), -1);
    nights.push({ date: evening, sleepMin: toMin(b.end - b.start) });
    for (const p of b.pieces) eachHour(p.start, p.end, (c, ms) => (sleepCell[c] += ms));
  }

  // Deep blocks and what follows them
  const deepBlocks: DeepBlock[] = blocksOf(roles.deep).map((b) => {
    const after = pieces.filter((p) => p.start >= b.end && p.start - b.end <= NEXT_MS && p.cat !== roles.deep);
    const q = after[0];
    let next: DeepBlock["next"] = "none";
    let wasteAfter = 0;
    if (q) {
      next = q.cat === roles.waste ? "waste" : "other";
      if (next === "waste") {
        let end = q.start;
        for (const p of pieces) {
          if (p.start < q.start || p.cat !== roles.waste) continue;
          if (p.start - end > GAP_MS) break;
          wasteAfter += p.end - p.start;
          end = p.end;
        }
      }
    }
    const acts = [...new Set(b.pieces.flatMap((p) => p.acts))].sort();
    return {
      start: new Date(b.start).toISOString(),
      min: toMin(b.end - b.start),
      activityIds: acts,
      next,
      wasteAfterMin: Math.min(60, toMin(wasteAfter)),
    };
  });

  // Short Shallow Entries per Activity
  const byEntry = new Map<Id, { ms: number; start: number; end: number; cat: Id; acts: readonly Id[] }>();
  for (const p of pieces) {
    const e = byEntry.get(p.entryId);
    if (e) {
      e.ms += p.end - p.start;
      e.end = Math.max(e.end, p.end);
    } else byEntry.set(p.entryId, { ms: p.end - p.start, start: p.start, end: p.end, cat: p.cat, acts: p.acts });
  }
  const deepPieces = pieces.filter((p) => roles.deep && p.cat === roles.deep);
  const short: Record<Id, { mins: number[]; days: Set<string>; nearDeep: number }> = {};
  for (const e of byEntry.values()) {
    if (!roles.shallow || e.cat !== roles.shallow || e.ms >= SHORT_MIN * MIN) continue;
    const near = deepPieces.some((d) =>
      (d.end <= e.start && e.start - d.end <= GAP_MS) || (d.start >= e.end && d.start - e.end <= GAP_MS)
    );
    for (const a of e.acts) {
      const s = (short[a] ??= { mins: [], days: new Set(), nearDeep: 0 });
      s.mins.push(e.ms / MIN);
      s.days.add(dateOf(e.start));
      if (near) s.nearDeep++;
    }
  }
  const shortEntries: Record<Id, ShortStat> = {};
  for (const [a, s] of Object.entries(short)) {
    shortEntries[a] = {
      count: s.mins.length,
      medianMin: Math.round(median(s.mins)),
      days: s.days.size,
      nearDeep: s.nearDeep,
    };
  }

  // Days
  const days: DayFacts[] = [];
  for (let d = 0; d < 7; d++) {
    const date = shiftDate(input.weekStart, d);
    const [y, m, dd] = shiftDate(input.weekStart, d + 1).split("-").map(Number);
    const dayEnd = startOfZonedDay(y, m, dd, tz);
    let unlogged = 0;
    let recovery = 0;
    for (let h = 0; h < 24; h++) {
      const c = d * 24 + h;
      unlogged += (elapsed[c] - covered[c]) * (1 - quietFraction(h, input.quietStart, input.quietEnd));
      if (roles.recovery) recovery += (cat[c][roles.recovery] ?? 0) - sleepCell[c];
    }
    const isElapsed = dayEnd <= input.now;
    const unloggedMin = toMin(unlogged);
    days.push({
      date,
      elapsed: isElapsed,
      unloggedOutsideQuiet: unloggedMin,
      recoveryAwake: Math.max(0, toMin(recovery)),
      logged: isElapsed && unloggedMin <= LOGGED_DAY_MAX_UNLOGGED,
    });
  }

  const roundMap = (m: Record<Id, number>) => {
    const out: Record<Id, number> = {};
    for (const [k, v] of Object.entries(m)) {
      const r = toMin(v);
      if (r > 0) out[k] = r;
    }
    return out;
  };
  const elapsedTotal = elapsed.reduce((a, b) => a + b, 0);
  const coveredTotal = covered.reduce((a, b) => a + b, 0);
  const facts: WeekFacts = {
    v: 1,
    weekStart: input.weekStart,
    asOf: new Date(winEnd).toISOString(),
    tz,
    loggedDays: days.filter((d) => d.logged).length,
    minutes: { byCategory: roundMap(byCategory), untagged: toMin(untagged), unlogged: toMin(elapsedTotal - coveredTotal) },
    byActivity: Object.fromEntries(
      Object.entries(byActivity).map(([k, v]) => [k, { total: toMin(v.total), byCategory: roundMap(v.byCategory) }]),
    ),
    hours: Array.from({ length: 168 }, (_, c) => ({ cat: roundMap(cat[c]), act: roundMap(act[c]), switches: switches[c] })),
    days,
    nights: nights.filter((n) => n.date >= input.weekStart && n.date <= shiftDate(input.weekStart, 6)),
    deepBlocks,
    shortEntries,
  };
  return { facts, pieces };
}

/** Hour cells before the span end of a week whose `asOf` is `asOf` (for the same-span rule). */
export function spanCells(f: Pick<WeekFacts, "weekStart" | "asOf" | "tz">): number {
  const p = zonedParts(Date.parse(f.asOf), f.tz);
  const [y, m, d] = f.weekStart.split("-").map(Number);
  const day = Math.round((Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(y, m - 1, d)) / 86_400_000);
  if (day >= 7) return 168;
  return Math.max(0, Math.min(168, day * 24 + p.hour));
}

/** The Category with the most minutes in a cell (heatmap colour), or null. */
export function topCategory(cell: Cell): Id | null {
  let best: Id | null = null;
  let max = 0;
  for (const [k, v] of Object.entries(cell.cat)) {
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return best;
}
