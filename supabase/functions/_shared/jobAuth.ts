/** Constant-time check of the `x-job-secret` header against the Server secret. */
export async function isJobAuthorized(
  req: Request,
  secret: string,
): Promise<boolean> {
  const given = req.headers.get("x-job-secret");
  if (!given || !secret) return false;
  // Hash both sides so the compared buffers always have the same length.
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(secret)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
