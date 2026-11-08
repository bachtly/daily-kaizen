import { assertEquals } from "@std/assert";
import { isJobAuthorized } from "./jobAuth.ts";
import { loadTagConfig } from "./config.ts";

const req = (h?: string) =>
  new Request("http://x", { headers: h ? { "x-job-secret": h } : {} });

Deno.test("isJobAuthorized accepts only the exact secret", async () => {
  assertEquals(await isJobAuthorized(req("s3cret"), "s3cret"), true);
  assertEquals(await isJobAuthorized(req("s3cre"), "s3cret"), false);
  assertEquals(await isJobAuthorized(req("s3cret!"), "s3cret"), false);
  assertEquals(await isJobAuthorized(req(), "s3cret"), false);
  assertEquals(await isJobAuthorized(req("x"), ""), false);
});

Deno.test("loadTagConfig lists missing names", () => {
  const env: Record<string, string> = { SUPABASE_URL: "u", JOB_SECRET: "j" };
  const r = loadTagConfig((n) => env[n]);
  assertEquals(r.ok, false);
  if (!r.ok) {
    assertEquals(r.missing, ["SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"]);
  }
  env.SUPABASE_SERVICE_ROLE_KEY = "k";
  env.ANTHROPIC_API_KEY = "a";
  assertEquals(loadTagConfig((n) => env[n]).ok, true);
});
