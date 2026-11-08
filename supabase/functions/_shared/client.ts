import { createClient } from "@supabase/supabase-js";

/** Service-role client; the job functions bypass RLS and check `x-job-secret` instead. */
export function createServiceClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
