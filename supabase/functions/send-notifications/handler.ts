import { isJobAuthorized } from "../_shared/jobAuth.ts";
import { loadNotifyConfig } from "../_shared/config.ts";
import type { PushDeps } from "../_shared/push.ts";
import { sendClaimed } from "./notify.ts";
import type { NotifyDb } from "./types.ts";

export interface HandlerDeps {
  getEnv: (name: string) => string | undefined;
  makeDb: (url: string, serviceRoleKey: string) => NotifyDb;
  /** `EdgeRuntime.waitUntil` in production. */
  waitUntil: (p: Promise<unknown>) => void;
  fetchFn?: typeof fetch;
  pushDeps?: PushDeps;
}

export async function handle(req: Request, d: HandlerDeps): Promise<Response> {
  if (req.method !== "POST") return new Response(null, { status: 405 });

  // Checked before claiming, so a missing secret never claims (and loses) a notification.
  const cfg = loadNotifyConfig(d.getEnv);
  if (!cfg.ok) {
    console.error(
      `send-notifications: missing config: ${cfg.missing.join(", ")}`,
    );
    return new Response("service unavailable", { status: 503 });
  }
  const c = cfg.config;
  if (!(await isJobAuthorized(req, c.jobSecret))) {
    return new Response("unauthorized", { status: 401 });
  }

  const db = d.makeDb(c.supabaseUrl, c.serviceRoleKey);
  const work = (async () => {
    try {
      const rows = await db.claim();
      const counts = await sendClaimed(rows, {
        db,
        push: c.push,
        email: c.email,
        fetchFn: d.fetchFn,
        pushDeps: { fetchFn: d.fetchFn, ...d.pushDeps },
      });
      console.log(
        `send-notifications: nudges=${counts.nudges} review_reminders=${counts.review_reminders}`,
      );
    } catch (e) {
      console.error(`send-notifications: job failed: ${(e as Error).message}`);
    }
  })();
  d.waitUntil(work);
  return new Response(null, { status: 202 });
}
