export const EMAIL_TIMEOUT_MS = 10_000;

export interface EmailConfig {
  resendApiKey: string;
  /** Sender, e.g. `daily-kaizen <noreply@mail.example.com>`. */
  from: string;
}

export interface Email {
  to: string;
  subject: string;
  text: string;
}

/** Sends through the Resend HTTP API; throws on timeout or non-2xx. No retry. */
export async function sendEmail(
  cfg: EmailConfig,
  email: Email,
  fetchFn: typeof fetch = fetch,
  idempotencyKey?: string,
): Promise<void> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${cfg.resendApiKey}`,
    "content-type": "application/json",
  };
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
  const res = await fetchFn("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: cfg.from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
    }),
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
  });
  await res.body?.cancel();
  if (!res.ok) throw new Error(`resend ${res.status}`);
}
