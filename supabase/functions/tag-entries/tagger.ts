import { buildPrompt, classify, parseReply } from "./ai.ts";
import type { TagDb } from "./types.ts";

export const BUDGET_MS = 110_000;

export interface TagDeps {
  db: TagDb;
  anthropicApiKey: string;
  fetchFn?: typeof fetch;
  now?: () => number;
  /** Category suggestion push. Called only for a newly inserted Suggested category; a failure never fails tagging. */
  onNewSuggestion?: (
    info: { entryId: string; userId: string; name: string },
  ) => Promise<void> | void;
}

/** Labels one Entry (Category and/or Activity). Returns "tagged", "failed" (attempt counted) or "skipped". Never logs Entry text. */
export async function tagEntry(
  entryId: string,
  deps: TagDeps,
): Promise<"tagged" | "failed" | "skipped"> {
  const { db } = deps;
  const entry = await db.getEntry(entryId);
  if (!entry || entry.tagging_gave_up_at !== null) return "skipped";
  // A label set by me is kept; a label that is already there is not asked for again.
  const needCategory = entry.category_id === null && entry.tag_source !== "me";
  const needActivity = entry.activity_source === null;
  if (!needCategory && !needActivity) return "skipped";

  const cats = await db.getCategories(entry.user_id);
  const active = cats.filter((c) => c.status === "active");
  const rejected = cats.filter((c) => c.status === "rejected");
  const activities = await db.getActiveActivityNames(entry.user_id);
  const corrections = await db.getCorrections(entry.user_id);

  let categoryId: string | null = null;
  let proposed: { name: string; description: string } | null = null;
  let activityName: string | null = null;
  let ok = false;
  try {
    const raw = await classify(
      buildPrompt(entry.text, active, rejected, activities, corrections),
      deps.anthropicApiKey,
      deps.fetchFn,
    );
    const reply = parseReply(raw);
    if (!reply) throw new Error("bad reply shape");
    if (needCategory) {
      const match = active.find(
        (c) => c.name.toLowerCase() === reply.category_name.toLowerCase(),
      );
      if (!match) throw new Error("category not active");
      categoryId = match.id;
      proposed = reply.proposed;
    }
    activityName = reply.activity_name;
    ok = true;
  } catch (e) {
    console.error(
      `tag-entries: entry ${entry.id} failed: ${(e as Error).message}`,
    );
  }

  if (!ok) {
    await db.recordTagFailure(entry.id, entry.updated_at);
    return "failed";
  }
  const inserted = await db.saveAiLabels({
    entryId: entry.id,
    readUpdatedAt: entry.updated_at,
    categoryId,
    proposedName: proposed?.name ?? null,
    proposedDescription: proposed?.description ?? null,
    // save_ai_labels ignores it when activity_source is me.
    activityName,
  });
  if (inserted && proposed) {
    try {
      await deps.onNewSuggestion?.({
        entryId: entry.id,
        userId: entry.user_id,
        name: proposed.name,
      });
    } catch (e) {
      console.error(
        `tag-entries: suggestion push failed: ${(e as Error).message}`,
      );
    }
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
