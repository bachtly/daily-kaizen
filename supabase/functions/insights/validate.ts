// Checks on the AI's output (design §7). Code computes every number; the AI may only repeat them.
// A card that fails gets its template wording; a coach note that fails keeps the old note.
import type { Evidence } from "../_shared/evidence.ts";
import { LIMITS } from "./templates.ts";
import type { CardText } from "./types.ts";

export const NOTE_MAX = 1200;
export const MAY_NOT_APPLY_MAX = 200;

const NUM = /\d+(?:[.,:]\d+)?/g;

/** The number tokens in a text: "6.5h" -> 6.5, "21:00" -> 21:00, "1,200" -> 1200. */
export function numbersIn(text: string): string[] {
  return (text.match(NUM) ?? []).map((t) => (/^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, "") : t.replace(",", ".")));
}

/**
 * Every way a source number may be written: the token itself, a clock as its hour (24 h and 12 h,
 * with or without a leading zero), hours as minutes, and minutes as hours.
 */
export function allowedFrom(texts: string[]): Set<string> {
  const out = new Set<string>();
  for (const text of texts) {
    for (const t of numbersIn(text)) {
      out.add(t);
      const clock = /^(\d{1,2}):(\d{2})$/.exec(t);
      if (clock) {
        const h = Number(clock[1]);
        out.add(String(h));
        out.add(String(h).padStart(2, "0"));
        out.add(String(h % 12 === 0 ? 12 : h % 12));
        out.add(`${h % 12 === 0 ? 12 : h % 12}:${clock[2]}`);
        continue;
      }
      const n = Number(t);
      if (!Number.isFinite(n)) continue;
      out.add(String(n));
      out.add(String(Math.round(n * 60))); // hours as minutes
      out.add(String(Math.round((n / 60) * 10) / 10)); // minutes as hours
    }
  }
  return out;
}

export function numbersOk(text: string, allowed: Set<string>): boolean {
  return numbersIn(text).every((t) => allowed.has(t) || allowed.has(String(Number(t))));
}

export type AiCard = CardText & { candidate_id: number; evidence_id: string; may_not_apply: string | null };

const IF_THEN = /^if\b[\s\S]*\bthen\b/i;
const clean = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

/** Why an AI card fails, or null when it passes. */
export function cardProblem(
  card: AiCard,
  c: { evidenceIds: string[]; facts: Record<string, string> },
  extra: { template: CardText; names: string[]; evidence: Evidence[] },
): string | null {
  const finding = clean(card.finding);
  const detail = clean(card.detail);
  const tryThis = clean(card.try_this);
  if (!finding || !detail || !tryThis) return "empty";
  if (finding.length > LIMITS.finding || detail.length > LIMITS.detail || tryThis.length > LIMITS.try_this) return "too long";
  if (!IF_THEN.test(tryThis)) return "not if-then";
  if (!c.evidenceIds.includes(card.evidence_id)) return "evidence not allowed";
  const mna = card.may_not_apply === null ? null : clean(card.may_not_apply);
  if (mna !== null && (mna === "" || mna.length > MAY_NOT_APPLY_MAX)) return "may_not_apply length";
  const allowed = allowedFrom([
    ...Object.values(c.facts),
    ...Object.values(extra.template),
    ...extra.names,
    ...extra.evidence.flatMap((e) => [e.label, e.shows, e.against ?? "", e.limits]),
  ]);
  for (const text of [finding, detail, tryThis, mna ?? ""]) if (!numbersOk(text, allowed)) return "number not in facts";
  return null;
}

export type AdhocCard = CardText & { evidence_id: string | null; refs: string[] };

/** Why an ad-hoc card fails, or null: same lengths and if-then shape, numbers only from the input, refs that exist. */
export function adhocProblem(
  card: AdhocCard,
  extra: { allowed: Set<string>; refs: Set<string>; evidenceIds: Set<string> },
): string | null {
  const finding = clean(card.finding);
  const detail = clean(card.detail);
  const tryThis = clean(card.try_this);
  if (!finding || !detail || !tryThis) return "empty";
  if (finding.length > LIMITS.finding || detail.length > LIMITS.detail || tryThis.length > LIMITS.try_this) return "too long";
  if (!IF_THEN.test(tryThis)) return "not if-then";
  if (card.evidence_id !== null && !extra.evidenceIds.has(card.evidence_id)) return "evidence not in the library";
  if (!Array.isArray(card.refs) || !card.refs.length || !card.refs.every((r) => extra.refs.has(r))) return "refs";
  for (const text of [finding, detail, tryThis]) if (!numbersOk(text, extra.allowed)) return "number not in the data";
  return null;
}

/** The note passes: within length, numbers only from the context, and my own lines kept word for word. */
export function noteProblem(note: string, context: string, myLines: string[]): string | null {
  const body = note.trim();
  if (body.length > NOTE_MAX) return "too long";
  if (!numbersOk(body, allowedFrom([context]))) return "number not in history";
  for (const line of myLines) if (!body.includes(line)) return "dropped my line";
  return null;
}
