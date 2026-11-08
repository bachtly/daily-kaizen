export interface TagConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  jobSecret: string;
  anthropicApiKey: string;
}

export type ConfigResult =
  | { ok: true; config: TagConfig }
  | { ok: false; missing: string[] };

const NAMES = {
  supabaseUrl: "SUPABASE_URL",
  serviceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
  jobSecret: "JOB_SECRET",
  anthropicApiKey: "ANTHROPIC_API_KEY",
} as const;

/** Reads the env; a missing or empty value is a 503 for the caller (kill switch). */
export function loadTagConfig(
  get: (name: string) => string | undefined,
): ConfigResult {
  const config = {} as Record<keyof typeof NAMES, string>;
  const missing: string[] = [];
  for (const [key, name] of Object.entries(NAMES)) {
    const v = get(name);
    if (v) config[key as keyof typeof NAMES] = v;
    else missing.push(name);
  }
  return missing.length ? { ok: false, missing } : { ok: true, config };
}
