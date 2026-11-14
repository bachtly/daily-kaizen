import { createServiceClient } from "../_shared/client.ts";
import { makeWord } from "./ai.ts";
import { dbFromClient } from "./db.ts";
import { handle } from "./handler.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

Deno.serve((req) =>
  handle(req, {
    getEnv: (n) => Deno.env.get(n),
    makeDb: (url, key) => dbFromClient(createServiceClient(url, key)),
    makeWord: (key, db) => makeWord(key, db),
    waitUntil: (p) => EdgeRuntime.waitUntil(p),
  })
);
