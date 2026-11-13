import type { CategoryRow, CorrectionRow, TagReply } from "./types.ts";

export const MODEL = "claude-haiku-5-5";
export const AI_TIMEOUT_MS = 20_000;

const TOOL = {
  name: "tag_entry",
  description: "Record the Category and the Activities for the Entry.",
  input_schema: {
    type: "object",
    properties: {
      category_name: {
        type: "string",
        description: "Exact name of one of the listed Categories.",
      },
      proposed: {
        description:
          "Only when no listed Category fits well: a new Category to suggest, else null.",
        anyOf: [
          { type: "null" },
          {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
            },
            required: ["name", "description"],
          },
        ],
      },
      activity_names: {
        type: "array",
        maxItems: 3,
        items: { type: "string" },
        description:
          "What the time was for, one short name each (e.g. a project, person, meal or game); at most 3, and more than one only when the Entry clearly does several things at once. Reuse a listed Activity name when the Entry is about it; otherwise a short new name; an empty list when no clear activity.",
      },
    },
    required: ["category_name", "proposed", "activity_names"],
  },
};

export const MAX_EXAMPLES = 20;

const normalise = (t: string) => t.trim().replace(/\s+/g, " ").toLowerCase();

/** Newest-first rows -> up to 20 corrections, one per normalised text (the newest wins). */
export function pickExamples(rows: CorrectionRow[]): CorrectionRow[] {
  const seen = new Set<string>();
  const out: CorrectionRow[] = [];
  for (const r of rows) {
    if (r.tag_source !== "me" && r.activity_source !== "me") continue;
    const key = normalise(r.text);
    if (key === "" || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length === MAX_EXAMPLES) break;
  }
  return out;
}

/** Shows only the labels I set myself; AI labels are never fed back. */
function exampleLine(r: CorrectionRow): string {
  const parts: string[] = [];
  if (r.tag_source === "me" && r.category_name) {
    parts.push(`Category: ${r.category_name}`);
  }
  if (r.activity_source === "me") {
    parts.push(`Activity: ${r.activity_names.join(", ") || "none"}`);
  }
  return parts.length
    ? `- ${JSON.stringify(r.text.trim())} -> ${parts.join(", ")}`
    : "";
}

export function buildPrompt(
  text: string,
  active: CategoryRow[],
  rejected: CategoryRow[],
  activities: string[] = [],
  corrections: CorrectionRow[] = [],
): string {
  const list = active.map((c) => `- ${c.name}: ${c.description}`).join("\n");
  const no = rejected.length
    ? `\nNever propose these names: ${rejected.map((c) => c.name).join(", ")}.`
    : "";
  const acts = activities.length
    ? `\n\nActive Activities (reuse one when the Entry is about it):\n${
      activities.map((a) => `- ${a}`).join("\n")
    }`
    : "\n\nThere are no Activities yet.";
  const examples = pickExamples(corrections).filter((r) =>
    exampleLine(r) !== ""
  );
  const ex = examples.length
    ? `\n\nExamples of my own labels (follow them for similar Entries):\n${
      examples.map(exampleLine).join("\n")
    }`
    : "";
  return `Classify this time-log Entry into exactly one Category and name its Activities (0 to 3).\n\nCategories:\n${list}${no}${acts}${ex}\n\nEntry:\n${text}`;
}

/** Calls Anthropic with a 20 s timeout; throws on timeout, non-2xx or a missing tool call. Never logs the text. */
export async function classify(
  prompt: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<unknown> {
  const res = await fetchFn("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const body = await res.json();
  const block = (body?.content ?? []).find(
    (b: { type?: string }) => b?.type === "tool_use",
  );
  if (!block) throw new Error("no tool_use in reply");
  return block.input;
}

const str = (v: unknown): v is string =>
  typeof v === "string" && v.trim() !== "";

export const MAX_ACTIVITIES = 3;

function parseNames(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of v) {
    if (!str(n)) continue;
    const name = n.trim();
    const key = normalise(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length === MAX_ACTIVITIES) break;
  }
  return out;
}

/** Returns a typed reply or null when the shape is wrong. */
export function parseReply(raw: unknown): TagReply | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!str(r.category_name)) return null;
  // Anything but a list of names means "no Activity"; blanks and repeats are dropped, extras beyond 3 too (#79).
  const activity_names = parseNames(r.activity_names);
  const p = r.proposed;
  if (p === null || p === undefined) {
    return {
      category_name: r.category_name.trim(),
      proposed: null,
      activity_names,
    };
  }
  if (typeof p !== "object") return null;
  const { name, description } = p as Record<string, unknown>;
  if (!str(name) || !str(description)) return null;
  return {
    category_name: r.category_name.trim(),
    proposed: { name: name.trim(), description: description.trim() },
    activity_names,
  };
}
