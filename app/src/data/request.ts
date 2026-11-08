import { mapError, type ErrorKey, type PostgrestLikeError } from './errors';

export const REQUEST_TIMEOUT_MS = 10_000;

export type Result<T> = { ok: true; data: T } | { ok: false; error: ErrorKey };

type Response<T> = { data: T | null; error: PostgrestLikeError | null; status: number };

/**
 * Run one Supabase call with a 10 s timeout and map every failure to an error key.
 * `call` receives an AbortSignal; pass it to the builder with `.abortSignal(signal)`.
 * A timeout or a thrown fetch error is `unknown` (result unknown, safe to resend).
 */
export async function request<T>(
  call: (signal: AbortSignal) => PromiseLike<Response<T>>,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Result<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await Promise.race([
      call(controller.signal),
      new Promise<never>((_, reject) =>
        controller.signal.addEventListener('abort', () => reject(new Error('timeout'))),
      ),
    ]);
    if (res.error) return { ok: false, error: mapError(res.error, res.status) };
    return { ok: true, data: res.data as T };
  } catch {
    return { ok: false, error: 'unknown' };
  } finally {
    clearTimeout(timer);
  }
}
