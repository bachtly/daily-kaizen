import { createServiceClient } from "../_shared/client.ts";
import { loadPushConfig, pushToUser } from "../_shared/push.ts";
import { pushDbFromClient } from "../_shared/pushDb.ts";
import { dbFromClient } from "./db.ts";
import { handle } from "./handler.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const getEnv = (n: string) => Deno.env.get(n);

Deno.serve((req) =>
  handle(req, {
    getEnv,
    makeDb: (url, key) => dbFromClient(createServiceClient(url, key)),
    // Best-effort: without VAPID/APP_URL config no suggestion push is sent and tagging is unaffected.
    makeOnNewSuggestion: (url, key) => {
      const push = loadPushConfig(getEnv);
      if (!push) return undefined;
      const db = pushDbFromClient(createServiceClient(url, key));
      return async ({ userId, name }) => {
        await pushToUser(db, userId, {
          title: `New category suggested: ${name}`,
          body: "Approve or reject it on This week.",
          path: "/week",
        }, push);
      };
    },
    waitUntil: (p) => EdgeRuntime.waitUntil(p),
  })
);
