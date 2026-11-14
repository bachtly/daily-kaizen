// The weekly AI step (design §7): one Messages call per user-week. The AI words cards, picks a source
// from each candidate's list, may flag "may not apply", adds up to 5 ad-hoc findings of its own from the
// week's data, and rewrites the coach note. Code checks it all.
import { EVIDENCE, type Evidence, evidenceById } from "../_shared/evidence.ts";
import { type Piece, rolesOf, type WeekFacts } from "../_shared/facts.ts";
import type { InsightsDb } from "./db.ts";
import { fmtH, median } from "./metrics.ts";
import type { Ranked } from "./rank.ts";
import type { WordFn } from "./run.ts";
import type { CardText } from "./types.ts";
import { type AdhocCard, adhocProblem, type AiCard, allowedFrom, cardProblem, noteProblem } from "./validate.ts";
import { dataTexts, weekData, type WeekData } from "./weekdata.ts";

export const MODEL = "claude-opus-5-5";
export const EFFORT = "medium";
export const AI_TIMEOUT_MS = 120_000;
export const FOLD_AFTER_WEEKS = 104;
export const ADHOC_MAX = 5;

export const SYSTEM = `You are the weekly coach in a personal time-tracking app. Each week the app's code finds candidate insights in the user's own log and computes every number. You word them, and you keep a short coach note that carries what you learn about this person from week to week.

Rules:
- Use only numbers that appear in the input. Never compute, round differently or estimate a number.
- For each candidate write: "finding" (at most 70 characters), "detail" (at most 120), and "try_this", an if-then plan in the form "If ..., then I ..." (at most 120), written in the first person as the user would say it.
- Tie the suggestion to the history when it helps: what was tried before, what helped, what was judged worse. Never repeat a plan whose result was "worse"; offer a different one.
- Respect the user's dismissals and their reasons, quoted in "dismissed". Do not argue with them.
- "evidence_id" must be one of the candidate's "allowed_evidence" ids.
- Set "may_not_apply" to a short reason, taken from the history, the coach note or a dismissal reason, only when the suggestion likely does not fit this person; otherwise null. Such a card is still shown, last.
- The "If" part is a concrete cue: a clock time from the facts, a place, or an event that happens anyway ("If I close the laptop for the day"), never an intention ("If I stop work").
- Plain, warm, non-judgemental English. No scores, no streaks, no exclamation marks.
- When "week_so_far" is true the week isn't over: say "so far this week", and don't treat a low total as a pattern yet.
- "coach_note": rewrite the note (at most 1200 characters) from the old note, the history and this week. Keep the lines in "my_lines" word for word. State a pattern only when at least 2 weeks of history, a dismissal or a reason supports it. No numbers except ones copied from the input.

Return one card per candidate, with its "candidate_id".

Ad-hoc findings ("adhoc"): the candidates come from fixed checks. Also read "week_data" yourself and add up to 5 findings it shows that no candidate already covers: patterns across days and hours, what tends to follow what, how an Activity's time is spread, anything a person would want to know about their week. Each one:
- "finding", "detail" and an if-then "try_this", with the same lengths and rules as the cards; every number copied from the input.
- "refs": the "week_data.timeline" refs it rests on, at least one.
- "evidence_id": an id from "library" only when that source really supports the suggestion; otherwise null. Never stretch a source to fit.
Only state what the data clearly shows; a finding from one or two days says so. Return fewer, or none, rather than guess.`;

export const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["cards", "adhoc", "coach_note"],
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["candidate_id", "finding", "detail", "try_this", "evidence_id", "may_not_apply"],
        properties: {
          candidate_id: { type: "integer" },
          finding: { type: "string" },
          detail: { type: "string" },
          try_this: { type: "string" },
          evidence_id: { type: "string" },
          may_not_apply: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
      },
    },
    adhoc: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["finding", "detail", "try_this", "evidence_id", "refs"],
        properties: {
          finding: { type: "string" },
          detail: { type: "string" },
          try_this: { type: "string" },
          evidence_id: { anyOf: [{ type: "string" }, { type: "null" }] },
          refs: { type: "array", items: { type: "string" } },
        },
      },
    },
    coach_note: { type: "string" },
  },
} as const;

export type CoachNote = { body: string; source: "ai" | "me" };

/** The current note and the lines I wrote: the newest "me" version, unless I cleared it since. */
export function noteState(versionsNewestFirst: CoachNote[]): { current: CoachNote | null; myLines: string[] } {
  const current = versionsNewestFirst[0] ?? null;
  const mine = versionsNewestFirst.find((v) => v.source === "me");
  const myLines = mine ? mine.body.split("\n").map((l) => l.trim()).filter(Boolean) : [];
  return { current, myLines };
}

type Change = { kind: string; try_this: string; week_start: string; active_until: string; result: { verdict?: string; baseline?: number[]; after?: number[]; unit?: string } | null };
type Dismissed = { kind: string; subject: string; week_start: string; reason: string | null };

/** One line per week, all weeks; weeks older than 2 years folded into months. */
export function historyLines(weeks: WeekFacts[], names: { id: string; name: string }[], changes: Change[]): string[] {
  const roles = rolesOf(names);
  const all = [...weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  // Weeks before I started logging aren't history: they'd read as gaps.
  const first = all.findIndex((f) => Object.values(f.minutes.byCategory).some((m) => m > 0) || f.minutes.untagged > 0);
  const sorted = first < 0 ? [] : all.slice(first);
  const changeFor = (w: string) =>
    changes.find((c) => c.week_start < w && c.active_until >= w);
  const nums = (f: WeekFacts) => ({
    deep: f.minutes.byCategory[roles.deep ?? ""] ?? 0,
    shallow: f.minutes.byCategory[roles.shallow ?? ""] ?? 0,
    maintenance: f.minutes.byCategory[roles.maintenance ?? ""] ?? 0,
    recovery: f.minutes.byCategory[roles.recovery ?? ""] ?? 0,
    waste: f.minutes.byCategory[roles.waste ?? ""] ?? 0,
    sleep: median(f.nights.map((n) => n.sleepMin)),
    switches: f.hours.reduce((a, c) => a + c.switches, 0),
  });
  const line = (label: string, n: ReturnType<typeof nums>, logged: string, extra = "") =>
    `${label} | logged days ${logged} | Deep ${fmtH(n.deep)}, Shallow ${fmtH(n.shallow)}, Maintenance ${fmtH(n.maintenance)}, Recovery ${fmtH(n.recovery)}, Waste ${fmtH(n.waste)} | median sleep ${fmtH(n.sleep)} | switches ${n.switches}${extra}`;
  const cut = sorted.length > FOLD_AFTER_WEEKS ? sorted[sorted.length - FOLD_AFTER_WEEKS].weekStart : "";
  const out: string[] = [];
  const months = new Map<string, WeekFacts[]>();
  for (const f of sorted) {
    if (f.weekStart < cut) {
      const m = f.weekStart.slice(0, 7);
      months.set(m, [...(months.get(m) ?? []), f]);
    }
  }
  for (const [m, fs] of months) {
    const ns = fs.map(nums);
    const avg = (k: keyof ReturnType<typeof nums>) => Math.round(ns.reduce((a, n) => a + n[k], 0) / ns.length);
    out.push(line(`${m} (average of ${fs.length} weeks)`, {
      deep: avg("deep"), shallow: avg("shallow"), maintenance: avg("maintenance"), recovery: avg("recovery"),
      waste: avg("waste"), sleep: avg("sleep"), switches: avg("switches"),
    }, String(Math.round(fs.reduce((a, f) => a + f.loggedDays, 0) / fs.length))));
  }
  for (const f of sorted) {
    if (f.weekStart < cut) continue;
    const c = changeFor(f.weekStart);
    out.push(line(`week of ${f.weekStart}`, nums(f), String(f.loggedDays), c ? ` | change running: "${c.try_this}"` : ""));
  }
  return out;
}

const UNIT: Record<string, (v: number) => string> = {
  min: (v) => fmtH(v),
  count: (v) => String(v),
  percent: (v) => `${v}%`,
};

export function changeLines(changes: Change[]): string[] {
  return changes.map((c) => {
    const r = c.result;
    const f = UNIT[r?.unit ?? "min"] ?? UNIT.min;
    const result = r?.verdict
      ? `usual ${(r.baseline ?? []).map(f).join(", ")} -> during ${(r.after ?? []).map(f).join(", ")}: ${r.verdict}`
      : "no result yet";
    return `${c.week_start} ${c.kind}: "${c.try_this}" (ran until the week of ${c.active_until}) - ${result}`;
  });
}

export type Context = {
  week_so_far: boolean;
  history: string[];
  changes: string[];
  dismissed: Dismissed[];
  coach_note: string;
  my_lines: string[];
  targets: string[];
  week_data: WeekData;
  library: { id: string; label: string; shows: string; against?: string; limits: string }[];
  candidates: {
    candidate_id: number;
    kind: string;
    facts: Record<string, string>;
    entries: number;
    template: CardText;
    allowed_evidence: { id: string; label: string; shows: string; against?: string; limits: string }[];
  }[];
};

export function buildContext(input: {
  ranked: Ranked[];
  templates: CardText[];
  history: string[];
  changes: string[];
  dismissed: Dismissed[];
  note: { current: CoachNote | null; myLines: string[] };
  targets: string[];
  partial?: boolean;
  weekData: WeekData;
}): Context {
  return {
    week_so_far: input.partial ?? false,
    history: input.history,
    changes: input.changes,
    dismissed: input.dismissed,
    coach_note: input.note.current?.body ?? "",
    my_lines: input.note.myLines,
    targets: input.targets,
    week_data: input.weekData,
    library: EVIDENCE.map(({ id, label, shows, against, limits }) => ({ id, label, shows, against, limits })),
    candidates: input.ranked.map((c, i) => ({
      candidate_id: i + 1,
      kind: c.kind,
      facts: c.facts,
      entries: c.entryIds.length,
      template: input.templates[i],
      allowed_evidence: c.evidenceIds.map((id) => evidenceById(id)).filter((e): e is Evidence => !!e)
        .map(({ id, label, shows, against, limits }) => ({ id, label, shows, against, limits })),
    })),
  };
}

export type AiReply = { cards: AiCard[]; adhoc: AdhocCard[]; coach_note: string; model: string; input_tokens: number; output_tokens: number };

/** Calls the Messages API with structured output; throws on a timeout, non-2xx, refusal, truncation or bad JSON. */
export async function callClaude(context: Context, apiKey: string, fetchFn: typeof fetch = fetch): Promise<AiReply> {
  const res = await fetchFn("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "server-side-fallback-2026-07-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: EFFORT, format: { type: "json_schema", schema: SCHEMA } },
      fallbacks: "default",
      messages: [{ role: "user", content: JSON.stringify(context) }],
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const body = await res.json();
  if (body?.stop_reason === "refusal") throw new Error("anthropic refusal");
  if (body?.stop_reason === "max_tokens") throw new Error("anthropic max_tokens");
  const text = (body?.content ?? []).filter((b: { type?: string }) => b?.type === "text").map((b: { text: string }) => b.text).join("");
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed?.cards) || typeof parsed?.coach_note !== "string") throw new Error("reply shape");
  return {
    cards: parsed.cards,
    adhoc: Array.isArray(parsed.adhoc) ? parsed.adhoc : [],
    coach_note: parsed.coach_note,
    model: String(body?.model ?? MODEL),
    input_tokens: Number(body?.usage?.input_tokens ?? 0),
    output_tokens: Number(body?.usage?.output_tokens ?? 0),
  };
}

/** Builds the WordFn the run uses: loads the history, calls the AI, checks every card and the note. */
export function makeWord(apiKey: string, db: InsightsDb, fetchFn: typeof fetch = fetch): WordFn {
  return async ({ userId, week, ranked, templates, partial, facts, pieces }) => {
    const [summaries, cats, changes, dismissed, notes, targets, acts] = await Promise.all([
      db.getSummaries(userId, "2000-01-03"),
      db.getCategories(userId),
      db.getChanges(userId),
      db.getDismissed(userId, addWeeks(week, -26)),
      db.getCoachNotes(userId),
      db.getTargets(userId),
      db.getActivities(userId),
    ]);
    const actName = Object.fromEntries(acts.map((a) => [a.id, a.name]));
    const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));
    const current = summaries.find((s) => s.weekStart === week);
    const targetLines = targets.map((t) => {
      const row = current?.byActivity[t.activity_id];
      const actual = row ? (t.category_id ? row.byCategory[t.category_id] ?? 0 : row.total) : 0;
      return `${actName[t.activity_id] ?? "an Activity"}${t.category_id ? ` · ${catName[t.category_id] ?? ""}` : ""}: target ${fmtH(t.minutes)}, this week ${fmtH(actual)}`;
    });
    const note = noteState(notes);
    const wd = weekData(facts, pieces, catName, actName);
    const context = buildContext({
      ranked,
      templates,
      history: historyLines(summaries, cats, changes),
      changes: changeLines(changes),
      dismissed,
      note,
      targets: targetLines,
      partial,
      weekData: wd.data,
    });
    const reply = await callClaude(context, apiKey, fetchFn);

    const names = [...Object.values(actName), ...Object.values(catName)];
    const cards = ranked.map((c, i) => {
      const card = reply.cards.find((k) => k.candidate_id === i + 1);
      if (!card) return null;
      const evidence = c.evidenceIds.map((id) => evidenceById(id)).filter((e): e is Evidence => !!e);
      const problem = cardProblem(card, c, { template: templates[i], names, evidence });
      if (problem) {
        console.warn(`insights: card ${c.kind} uses its template: ${problem}`);
        return null;
      }
      const tidy = (s: string) => s.replace(/\s+/g, " ").trim();
      return {
        finding: tidy(card.finding),
        detail: tidy(card.detail),
        try_this: tidy(card.try_this),
        evidence_id: card.evidence_id,
        may_not_apply: card.may_not_apply === null ? null : tidy(card.may_not_apply),
      };
    });

    const body = reply.coach_note.trim();
    const problem = noteProblem(body, JSON.stringify(context), note.myLines);
    // A mid-week run doesn't rewrite the long-term note: the week's numbers aren't final.
    if (partial) { /* keep */ }
    else if (problem) console.warn(`insights: coach note kept: ${problem}`);
    else if (body !== (note.current?.body ?? "")) await db.addCoachNote(userId, week, body);

    // Ad-hoc findings: numbers only from the context, refs that exist, a source only from the library.
    const allowed = allowedFrom([
      ...dataTexts(wd.data),
      ...context.history,
      ...context.targets,
      ...names,
      ...ranked.flatMap((c) => Object.values(c.facts)),
      ...EVIDENCE.flatMap((e) => [e.label, e.shows, e.against ?? "", e.limits]),
    ]);
    const refs = new Set(wd.data.timeline.map((t) => t.ref));
    const evidenceIds = new Set(EVIDENCE.map((e) => e.id));
    const adhoc = reply.adhoc.flatMap((a) => {
      const problem = adhocProblem(a, { allowed, refs, evidenceIds });
      if (problem) {
        console.warn(`insights: ad-hoc finding dropped: ${problem}`);
        return [];
      }
      const tidy = (s: string) => s.replace(/\s+/g, " ").trim();
      return [{
        finding: tidy(a.finding),
        detail: tidy(a.detail),
        try_this: tidy(a.try_this),
        evidence_id: a.evidence_id,
        entry_ids: [...new Set(a.refs.flatMap((r) => wd.entriesByRef.get(r) ?? []))],
      }];
    }).slice(0, ADHOC_MAX);

    return { cards, adhoc, model: reply.model, input_tokens: reply.input_tokens, output_tokens: reply.output_tokens };
  };
}

const addWeeks = (date: string, weeks: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 7 * weeks)).toISOString().slice(0, 10);
};
