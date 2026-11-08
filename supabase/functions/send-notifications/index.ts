import { createServiceClient } from "../_shared/client.ts";
import { notifyDbFromClient } from "./db.ts";
import { handle } from "./handler.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

Deno.serve((req) =>
  handle(req, {
    getEnv: (n) => Deno.env.get(n),
    makeDb: (url, key) => notifyDbFromClient(createServiceClient(url, key)),
    waitUntil: (p) => EdgeRuntime.waitUntil(p),
  })
);
