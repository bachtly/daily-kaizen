import type { EmailConfig } from "./email.ts";
import type { PushConfig } from "./push.ts";

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

export interface NotifyConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  jobSecret: string;
  push: PushConfig;
  email: EmailConfig;
}

export type NotifyConfigResult =
  | { ok: true; config: NotifyConfig }
  | { ok: false; missing: string[] };

const NOTIFY_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JOB_SECRET",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "APP_URL",
  "RESEND_API_KEY",
  "RESEND_FROM",
] as const;

/** Everything send-notifications needs; any missing name is a 503 before anything is claimed. */
export function loadNotifyConfig(
  get: (name: string) => string | undefined,
): NotifyConfigResult {
  const v: Record<string, string> = {};
  const missing: string[] = [];
  for (const n of NOTIFY_NAMES) {
    const x = get(n);
    if (x) v[n] = x;
    else missing.push(n);
  }
  if (missing.length) return { ok: false, missing };
  return {
    ok: true,
    config: {
      supabaseUrl: v.SUPABASE_URL,
      serviceRoleKey: v.SUPABASE_SERVICE_ROLE_KEY,
      jobSecret: v.JOB_SECRET,
      push: {
        vapidPrivateKey: v.VAPID_PRIVATE_KEY,
        vapidSubject: v.VAPID_SUBJECT,
        appUrl: v.APP_URL,
      },
      email: { resendApiKey: v.RESEND_API_KEY, from: v.RESEND_FROM },
    },
  };
}
