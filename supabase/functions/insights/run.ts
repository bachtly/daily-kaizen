// One user's runs (design §2, §9): compute summaries, detect, rank, word and save; and on Monday,
// finalise the last weeks and judge running changes.
import { evidenceById } from "../_shared/evidence.ts";
import { computeWeek, type FactsEntry, type Piece, rolesOf, type Roles, type WeekFacts } from "../_shared/facts.ts";
import { mondayOf, weekBounds } from "../_shared/week.ts";
import type { InsightRow, InsightsDb, UserSettings } from "./db.ts";
import { detectAll, weekSoFar } from "./detectors.ts";
import { evaluate } from "./evaluate.ts";
import { addDays, rank, type Ranked, WEIGHT_WEEKS } from "./rank.ts";
import { templateText } from "./templates.ts";
import type { CardText, DetectContext } from "./types.ts";

export const MIN_LOGGED_DAYS = 5;
/** "Get insights now" works mid-week, from this many logged days. */
export const MIN_LOGGED_DAYS_NOW = 2;
export const HISTORY_WEEKS = 8;
export const FINALISE_WEEKS = 9;

/** Optional AI wording (next PR): returns text per candidate index, or null to keep templates. */
export type WordFn = (input: {
  userId: string;
  week: string;
  ranked: Ranked[];
  templates: CardText[];
  /** the week isn't over yet: word it as "so far", and keep the coach note */
  partial: boolean;
}) => Promise<
  {
    cards: (CardText & { evidence_id: string; may_not_apply: string | null } | null)[];
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
  } | null
>;

type Loaded = {
  roles: Roles;
  activityNames: Record<string, string>;
  categoryNames: Record<string, string>;
  resolve: (id: string) => string;
};

async function load(db: InsightsDb, userId: string): Promise<Loaded> {
  const [cats, acts] = await Promise.all([db.getCategories(userId), db.getActivities(userId)]);
  const byId = new Map(acts.map((a) => [a.id, a]));
  // A merged Activity reports under the end of its chain.
  const resolve = (id: string) => {
    let a = byId.get(id);
    for (let hops = 0; a?.merged_into_id && hops < 20; hops++) a = byId.get(a.merged_into_id);
    return a?.id ?? id;
  };
  return {
    roles: rolesOf(cats),
    activityNames: Object.fromEntries(acts.filter((a) => a.status === "active").map((a) => [a.id, a.name])),
    categoryNames: Object.fromEntries(cats.map((c) => [c.id, c.name])),
    resolve,
  };
}

/** Computes and stores summaries for the given weeks (one Entries query). */
export async function computeSummaries(
  db: InsightsDb,
  user: UserSettings,
  weeks: string[],
  now: number,
  l: Loaded,
): Promise<Map<string, { facts: WeekFacts; pieces: Piece[] }>> {
  const out = new Map<string, { facts: WeekFacts; pieces: Piece[] }>();
  if (!weeks.length) return out;
  const sorted = [...weeks].sort();
  const from = weekBounds(sorted[0], user.time_zone).start;
  const to = weekBounds(sorted[sorted.length - 1], user.time_zone).end;
  const raw = await db.getEntries(user.user_id, new Date(from).toISOString(), new Date(to).toISOString());
  const entries: FactsEntry[] = raw.map((e) => ({
    ...e,
    activity_ids: [...new Set(e.activity_ids.map(l.resolve))],
  }));
  for (const w of sorted) {
    const r = computeWeek({
      entries,
      weekStart: w,
      tz: user.time_zone,
      now,
      roles: l.roles,
      quietStart: user.quiet_start,
      quietEnd: user.quiet_end,
    });
    await db.upsertSummary(user.user_id, r.facts);
    out.set(w, r);
  }
  return out;
}

export type GenerateOutcome = { status: "ok" | "too_early" | "ai_failed"; saved: number };

/** New insights for the week containing `now` (design §9). */
export async function generate(
  db: InsightsDb,
  user: UserSettings,
  now: number,
  trigger: "schedule" | "me",
  word?: WordFn,
): Promise<GenerateOutcome> {
  const week = mondayOf(now, user.time_zone);
  const runId = await db.startRun(user.user_id, week, trigger);
  try {
    const l = await load(db, user.user_id);
    const earliest = addDays(week, -7 * HISTORY_WEEKS);
    const stored = await db.getSummaries(user.user_id, earliest);
    const have = new Set(stored.map((f) => f.weekStart));
    const missing = Array.from({ length: HISTORY_WEEKS }, (_, k) => addDays(week, -7 * (k + 1))).filter((w) => !have.has(w));
    const computed = await computeSummaries(db, user, [week, ...missing], now, l);
    const cur = computed.get(week)!;
    if (cur.facts.loggedDays < (trigger === "me" ? MIN_LOGGED_DAYS_NOW : MIN_LOGGED_DAYS)) {
      await db.finishRun(user.user_id, runId, { status: "too_early" });
      return { status: "too_early", saved: 0 };
    }
    const history = [
      ...stored.filter((f) => f.weekStart < week),
      ...missing.map((w) => computed.get(w)!.facts),
    ].sort((a, b) => b.weekStart.localeCompare(a.weekStart));

    const ctx: DetectContext = {
      current: cur.facts,
      pieces: cur.pieces,
      history,
      roles: l.roles,
      activityNames: l.activityNames,
      categoryNames: l.categoryNames,
      targets: await db.getTargets(user.user_id),
      quietStart: user.quiet_start,
    };
    const past = await db.getPastInsights(user.user_id, addDays(week, -7 * WEIGHT_WEEKS));
    const ranked = rank(detectAll(ctx), past, week);
    const templates = ranked.map(templateText);

    let status: GenerateOutcome["status"] = "ok";
    let worded: Awaited<ReturnType<WordFn>> = null;
    if (word && ranked.length) {
      try {
        worded = await word({ userId: user.user_id, week, ranked, templates, partial: weekSoFar(cur.facts) });
      } catch (e) {
        console.error(`insights: wording failed: ${(e as Error).message}`);
        status = "ai_failed";
      }
    }

    const rows: InsightRow[] = ranked.map((c, i) => {
      const ai = worded?.cards[i] ?? null;
      const text = ai ?? templates[i];
      const evidenceId = ai?.evidence_id ?? c.evidenceIds[0];
      return {
        kind: c.kind,
        subject_key: c.subjectKey,
        rank: c.rank,
        score: Math.round(c.score * 100) / 100,
        facts: c.facts,
        entry_ids: c.entryIds,
        metric: c.metric,
        finding: text.finding,
        detail: text.detail,
        try_this: text.try_this,
        text_source: ai ? "ai" : "template",
        may_not_apply: ai?.may_not_apply ?? null,
        evidence: evidenceById(evidenceId) ?? evidenceById(c.evidenceIds[0]),
      };
    });
    // A card flagged "may not apply" sorts last (design §6); ranks follow the new order.
    rows.sort((a, b) => Number(a.may_not_apply !== null) - Number(b.may_not_apply !== null) || a.rank - b.rank);
    rows.forEach((r, i) => (r.rank = i + 1));

    const saved = await db.saveInsights(user.user_id, week, rows);
    await db.finishRun(user.user_id, runId, {
      status,
      model: worded?.model,
      input_tokens: worded?.input_tokens,
      output_tokens: worded?.output_tokens,
    });
    return { status, saved };
  } catch (e) {
    await db.finishRun(user.user_id, runId, { status: "ai_failed", error: (e as Error).message.slice(0, 500) })
      .catch(() => {});
    throw e;
  }
}

/** Monday: recompute the last 9 full weeks (picks up backfills), then judge running changes. */
export async function finalise(db: InsightsDb, user: UserSettings, now: number): Promise<number> {
  const thisWeek = mondayOf(now, user.time_zone);
  const justEnded = addDays(thisWeek, -7);
  const l = await load(db, user.user_id);
  const weeks = Array.from({ length: FINALISE_WEEKS }, (_, k) => addDays(justEnded, -7 * k));
  await computeSummaries(db, user, weeks, now, l);
  const running = await db.getRunningChanges(user.user_id, justEnded);
  if (!running.length) return 0;
  const earliest = running.reduce((a, r) => (r.week_start < a ? r.week_start : a), justEnded);
  const all = await db.getSummaries(user.user_id, addDays(earliest, -7 * 8));
  const byWeek = new Map(all.filter((f) => f.weekStart <= justEnded).map((f) => [f.weekStart, f]));
  let n = 0;
  for (const r of running) {
    const result = evaluate(r, byWeek, l.roles, justEnded, new Date(now));
    if (!result) continue;
    await db.saveResult(user.user_id, r.id, result);
    n++;
  }
  return n;
}
