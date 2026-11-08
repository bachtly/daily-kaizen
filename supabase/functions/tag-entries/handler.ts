import { isJobAuthorized } from "../_shared/jobAuth.ts";
import { loadTagConfig } from "../_shared/config.ts";
import { type TagDeps, tagMany } from "./tagger.ts";
import type { TagDb } from "./types.ts";

export interface HandlerDeps {
  getEnv: (name: string) => string | undefined;
  makeDb: (url: string, serviceRoleKey: string) => TagDb;
  /** `EdgeRuntime.waitUntil` in production. */
  waitUntil: (p: Promise<unknown>) => void;
  /** Builds the Category suggestion push hook; absent or returning undefined means no push. */
  makeOnNewSuggestion?: (
    url: string,
    serviceRoleKey: string,
  ) => TagDeps["onNewSuggestion"];
  fetchFn?: typeof fetch;
  now?: () => number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handle(req: Request, d: HandlerDeps): Promise<Response> {
  if (req.method !== "POST") return new Response(null, { status: 405 });

  // Missing config is a 503 and never counts as an attempt.
  const cfg = loadTagConfig(d.getEnv);
  if (!cfg.ok) {
    console.error(`tag-entries: missing config: ${cfg.missing.join(", ")}`);
    return new Response("service unavailable", { status: 503 });
  }
  const c = cfg.config;
  if (!(await isJobAuthorized(req, c.jobSecret))) {
    return new Response("unauthorized", { status: 401 });
  }

  let body: { entry_id?: unknown } = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) ?? {};
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const entryId = body.entry_id;
  if (
    entryId !== undefined && (typeof entryId !== "string" || !UUID.test(entryId))
  ) {
    return new Response("bad request", { status: 400 });
  }

  const db = d.makeDb(c.supabaseUrl, c.serviceRoleKey);
  const work = (async () => {
    try {
      const ids = entryId
        ? [entryId as string]
        : (await db.untaggedDue()).map((r) => r.id);
      await tagMany(ids, {
        db,
        anthropicApiKey: c.anthropicApiKey,
        fetchFn: d.fetchFn,
        now: d.now,
        onNewSuggestion: d.makeOnNewSuggestion?.(c.supabaseUrl, c.serviceRoleKey),
      });
    } catch (e) {
      console.error(`tag-entries: job failed: ${(e as Error).message}`);
    }
  })();
  d.waitUntil(work);
  return new Response(null, { status: 202 });
}
