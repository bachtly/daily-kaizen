// Error keys from 04-api Errors. Validation keys are check names or trigger/function messages.
export const VALIDATION_KEYS = [
  'entry_text_empty',
  'entry_end_not_after_start',
  'entry_end_in_future',
  'time_zone_unknown',
  'quiet_hours_equal',
  'nudge_gap_out_of_range',
  'week_start_not_monday',
  'entry_not_found',
  'category_not_active',
  'category_already_decided',
] as const;

export type ValidationKey = (typeof VALIDATION_KEYS)[number];
// unknown = no connection or timeout (result unknown, safe to resend); session_lost = sign in again;
// server = 5xx or any other refusal.
export type ErrorKey = ValidationKey | 'unknown' | 'session_lost' | 'server';

export type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

/** Map a PostgREST error (and HTTP status, 0 when no response) to an error key. */
export function mapError(error: PostgrestLikeError | null | undefined, status = 0): ErrorKey {
  const code = error?.code ?? '';
  if (code === 'PGRST301' || code === 'PGRST303' || status === 401) return 'session_lost';
  if (status >= 500) return 'server';
  if (status === 400) {
    // Check violations name the constraint inside the message; raised errors are the message itself.
    const text = `${error?.message ?? ''} ${error?.details ?? ''}`;
    const found = VALIDATION_KEYS.find((k) => new RegExp(`\\b${k}\\b`).test(text));
    return found ?? 'server';
  }
  if (status === 0) return 'unknown';
  return 'server';
}
