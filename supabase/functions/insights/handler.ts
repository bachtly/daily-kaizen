// Insights function (design §9).
// Job (x-job-secret), hourly: per user with a time zone, Sunday 18:00-18:59 local -> new insights once a
// week, retried up to 3 times that evening if the AI failed; Monday 04:00-04:59 local -> change results.
// Phone (Authorization: Bearer <my JWT>): new insights for this or last week now, at most once a minute.
import { loadInsightsConfig } from "../_shared/config.ts";
import { isJobAuthorized } from "../_shared/jobAuth.ts";
import { mondayOf, weekBounds, zonedParts } from "../_shared/week.ts";
import type { InsightsDb, UserSettings } from "./db.ts";
import { addDays } from "./rank.ts";
import { finalise, generate, type WordFn } from "./run.ts";

export interface HandlerDeps {
  getEnv: (name: string) => string | undefined;
  makeDb: (url: string, serviceRoleKey: string) => InsightsDb;
  waitUntil: (p: Promise<unknown>) => void;
  /** AI wording; absent means template wording */
  makeWord?: (apiKey: string, db: InsightsDb) => WordFn;
  now?: () => number;
}

export const GENERATE = { weekday: 6, hour: 18 } as const; // Sunday, an hour before the Review reminder
export const FINALISE = { weekday: 0, hour: 4 } as const; // Monday, once the week has fully ended
export const MAX_AI_RETRIES = 3;
export const MY_RUN_GAP_MS = 60_000;

export function dueAction(user: UserSettings, now: number): "generate" | "retry" | "finalise" | null {
  const p = zonedParts(now, user.time_zone);
  if (p.weekday === GENERATE.weekday && p.hour === GENERATE.hour) return "generate";
  if (p.weekday === GENERATE.weekday && p.hour > GENERATE.hour) return "retry";
  if (p.weekday === FINALISE.weekday && p.hour === FINALISE.hour) return "finalise";
  return null;
}

/** Runs what is due for every user; one user's failure doesn't stop the others. */
export async function runDue(db: InsightsDb, now: number, word?: WordFn): Promise<void> {
  for (const user of await db.listUsers()) {
    try {
      const action = dueAction(user, now);
      if (action === "finalise") await finalise(db, user, now);
      if (action === "generate" || action === "retry") {
        const week = mondayOf(now, user.time_zone);
        const statuses = await db.runStatuses(user.user_id, week, "schedule");
        if (statuses.some((s) => s === "ok" || s === "too_early")) continue;
        if (action === "retry" && (!statuses.includes("ai_failed") || statuses.filter((s) => s === "ai_failed").length >= MAX_AI_RETRIES)) continue;
        await generate(db, user, now, "schedule", word);
      }
    } catch (e) {
      console.error(`insights: user run failed: ${(e as Error).message}`);
    }
  }
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

/** The phone's "Get insights now" / "Update": this or last week, once a minute. */
async function forMe(req: Request, db: InsightsDb, now: number, word?: WordFn): Promise<Response> {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const userId = jwt ? await db.userFromJwt(jwt) : null;
  if (!userId) return json(401, { error: "unauthorized" });
  const user = await db.getUser(userId);
  if (!user) return json(409, { error: "time_zone_unknown" });

  let body: { week_start?: unknown } = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) ?? {};
  } catch {
    return json(400, { error: "bad_request" });
  }
  const thisWeek = mondayOf(now, user.time_zone);
  const week = body.week_start ?? thisWeek;
  if (week !== thisWeek && week !== addDays(thisWeek, -7)) return json(400, { error: "week_not_allowed" });

  const last = await db.lastMyRunAt(userId);
  if (last && now - Date.parse(last) < MY_RUN_GAP_MS) {
    return json(429, { error: "too_soon", retry_after: new Date(Date.parse(last) + MY_RUN_GAP_MS).toISOString() });
  }
  // Last week: as if run at its end, so it covers the whole week.
  const at = week === thisWeek ? now : weekBounds(week as string, user.time_zone).end - 1;
  const outcome = await generate(db, user, at, "me", word);
  return json(200, outcome);
}

export async function handle(req: Request, d: HandlerDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: CORS });
  const cfg = loadInsightsConfig(d.getEnv);
  if (!cfg.ok) {
    console.error(`insights: missing config: ${cfg.missing.join(", ")}`);
    return new Response("service unavailable", { status: 503, headers: CORS });
  }
  const c = cfg.config;
  const db = d.makeDb(c.supabaseUrl, c.serviceRoleKey);
  const word = c.anthropicApiKey && d.makeWord ? d.makeWord(c.anthropicApiKey, db) : undefined;
  const now = (d.now ?? Date.now)();

  if (!req.headers.has("x-job-secret")) {
    try {
      return await forMe(req, db, now, word);
    } catch (e) {
      console.error(`insights: my run failed: ${(e as Error).message}`);
      return json(500, { error: "failed" });
    }
  }
  if (!(await isJobAuthorized(req, c.jobSecret))) return new Response("unauthorized", { status: 401 });
  d.waitUntil(runDue(db, now, word).catch((e) => console.error(`insights: job failed: ${(e as Error).message}`)));
  return new Response(null, { status: 202 });
}
