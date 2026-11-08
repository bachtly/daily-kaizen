import { buildPrompt, classify, parseReply } from "./ai.ts";
import type { TagDb } from "./types.ts";

export const BUDGET_MS = 110_000;

export interface TagDeps {
  db: TagDb;
  anthropicApiKey: string;
  fetchFn?: typeof fetch;
  now?: () => number;
  /** TODO(fn-send-notifications): send the Category suggestion push. Called only for a newly inserted Suggested category. */
  onNewSuggestion?: (
    info: { entryId: string; userId: string; name: string },
  ) => Promise<void> | void;
}

/** Tags one Entry. Returns "tagged", "failed" (attempt counted) or "skipped". Never logs Entry text. */
export async function tagEntry(
  entryId: string,
  deps: TagDeps,
): Promise<"tagged" | "failed" | "skipped"> {
  const { db } = deps;
  const entry = await db.getEntry(entryId);
  if (
    !entry || entry.category_id !== null || entry.tag_source === "me" ||
    entry.tagging_gave_up_at !== null
  ) return "skipped";

  const cats = await db.getCategories(entry.user_id);
  const active = cats.filter((c) => c.status === "active");
  const rejected = cats.filter((c) => c.status === "rejected");

  let categoryId: string | null = null;
  let proposed: { name: string; description: string } | null = null;
  try {
    const raw = await classify(
      buildPrompt(entry.text, active, rejected),
      deps.anthropicApiKey,
      deps.fetchFn,
    );
    const reply = parseReply(raw);
    if (!reply) throw new Error("bad reply shape");
    const match = active.find(
      (c) => c.name.toLowerCase() === reply.category_name.toLowerCase(),
    );
    if (!match) throw new Error("category not active");
    categoryId = match.id;
    proposed = reply.proposed;
  } catch (e) {
    console.error(
      `tag-entries: entry ${entry.id} failed: ${(e as Error).message}`,
    );
  }

  const inserted = await db.saveAiTag({
    entryId: entry.id,
    readUpdatedAt: entry.updated_at,
    categoryId,
    proposedName: categoryId ? proposed?.name ?? null : null,
    proposedDescription: categoryId ? proposed?.description ?? null : null,
  });
  if (categoryId === null) return "failed";
  if (inserted && proposed) {
    await deps.onNewSuggestion?.({
      entryId: entry.id,
      userId: entry.user_id,
      name: proposed.name,
    });
  }
  return "tagged";
}

/** Runs the ids one at a time; starts no new Entry after BUDGET_MS. */
export async function tagMany(ids: string[], deps: TagDeps): Promise<void> {
  const now = deps.now ?? Date.now;
  const start = now();
  for (const id of ids) {
    if (now() - start >= BUDGET_MS) return;
    try {
      await tagEntry(id, deps);
    } catch (e) {
      console.error(`tag-entries: entry ${id} error: ${(e as Error).message}`);
    }
  }
}
