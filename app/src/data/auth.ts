import { db } from './db';
import { supabase } from './supabase';
import type { ErrorKey } from './errors';

export type AuthResult = { ok: true } | { ok: false; error: 'invalid_code' | ErrorKey };

const TIMEOUT_MS = 10_000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

type AuthErr = { status?: number; name?: string };

function transport(error: AuthErr): 'server' | 'unknown' | null {
  const status = error.status ?? 0;
  if (status >= 500) return 'server';
  if (status === 0 || error.name === 'AuthRetryableFetchError') return 'unknown';
  return null;
}

/**
 * Email a sign-in code. Sign-ups are off (shouldCreateUser false). Any answer from the server
 * other than a 5xx counts as sent, so the screen shows the same message for every email (AC-7.2).
 */
export async function sendCode(email: string): Promise<AuthResult> {
  try {
    const { error } = await withTimeout(
      supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } }),
    );
    if (!error) return { ok: true };
    const t = transport(error);
    return t ? { ok: false, error: t } : { ok: true };
  } catch {
    return { ok: false, error: 'unknown' };
  }
}

/** Check the 6-digit code; on success the client stores the session. */
export async function verifyCode(email: string, token: string): Promise<AuthResult> {
  try {
    const { error } = await withTimeout(supabase.auth.verifyOtp({ email, token, type: 'email' }));
    if (!error) return { ok: true };
    return { ok: false, error: transport(error) ?? 'invalid_code' };
  } catch {
    return { ok: false, error: 'unknown' };
  }
}

/**
 * Sign this device out (other devices keep their sessions) and clear the Local copy.
 * Needs the Server: on failure the session and the Local copy are kept.
 */
export async function signOut(): Promise<{ ok: true } | { ok: false; error: ErrorKey }> {
  try {
    const { error } = await withTimeout(supabase.auth.signOut({ scope: 'local' }));
    if (error) return { ok: false, error: transport(error) ?? 'server' };
  } catch {
    return { ok: false, error: 'unknown' };
  }
  await db.transaction('rw', [db.entries, db.categories, db.settings, db.weekly_reviews, db.meta], () =>
    Promise.all([db.entries.clear(), db.categories.clear(), db.settings.clear(), db.weekly_reviews.clear(), db.meta.clear()]),
  ).catch(() => {}); // the Local copy is disposable; the next sign-in's refresh replaces it anyway
  return { ok: true };
}
