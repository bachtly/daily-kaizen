// Hourly Insights check (design §9). Job-only: x-job-secret. Per user with a time zone:
// Sunday 18:00-18:59 local -> new insights once a week; Monday 04:00-04:59 local -> change results.
import { loadInsightsConfig } from "../_shared/config.ts";
import { isJobAuthorized } from "../_shared/jobAuth.ts";
import { mondayOf, zonedParts } from "../_shared/week.ts";
import type { InsightsDb, UserSettings } from "./db.ts";
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

export function dueAction(user: UserSettings, now: number): "generate" | "finalise" | null {
  const p = zonedParts(now, user.time_zone);
  if (p.weekday === GENERATE.weekday && p.hour === GENERATE.hour) return "generate";
  if (p.weekday === FINALISE.weekday && p.hour === FINALISE.hour) return "finalise";
  return null;
}

/** Runs what is due for every user; one user's failure doesn't stop the others. */
export async function runDue(db: InsightsDb, now: number, word?: WordFn): Promise<void> {
  for (const user of await db.listUsers()) {
    try {
      const action = dueAction(user, now);
      if (action === "finalise") await finalise(db, user, now);
      if (action === "generate") {
        const week = mondayOf(now, user.time_zone);
        if (await db.hasRun(user.user_id, week, "schedule", ["ok", "too_early"])) continue;
        await generate(db, user, now, "schedule", word);
      }
    } catch (e) {
      console.error(`insights: user run failed: ${(e as Error).message}`);
    }
  }
}

export async function handle(req: Request, d: HandlerDeps): Promise<Response> {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const cfg = loadInsightsConfig(d.getEnv);
  if (!cfg.ok) {
    console.error(`insights: missing config: ${cfg.missing.join(", ")}`);
    return new Response("service unavailable", { status: 503 });
  }
  const c = cfg.config;
  if (!(await isJobAuthorized(req, c.jobSecret))) return new Response("unauthorized", { status: 401 });
  const db = d.makeDb(c.supabaseUrl, c.serviceRoleKey);
  const word = c.anthropicApiKey && d.makeWord ? d.makeWord(c.anthropicApiKey, db) : undefined;
  const now = (d.now ?? Date.now)();
  d.waitUntil(runDue(db, now, word).catch((e) => console.error(`insights: job failed: ${(e as Error).message}`)));
  return new Response(null, { status: 202 });
}
