import { Phone } from './Phone';

export type SignInScreenProps = {
  step?: 'email' | 'code';
  email?: string;
  busy?: boolean;
  error?: 'wrong-code' | 'rate-limited';
  /** Opened in Safari instead of the home-screen app. */
  inSafari?: boolean;
  resendWaitSeconds?: number;
};

/** Sign in with a 6-digit email code (UC-6). Same message for any email, so it reveals nothing (AC-7.2). */
export function SignInScreen({ step = 'email', email = '', busy, error, inSafari, resendWaitSeconds = 0 }: SignInScreenProps) {
  if (inSafari) {
    return (
      <Phone>
        <h1>daily-kaizen</h1>
        <p className="note">Add daily-kaizen to your Home Screen: Share → Add to Home Screen. Then open it from there to sign in.</p>
      </Phone>
    );
  }
  return (
    <Phone>
      <h1>daily-kaizen</h1>
      <label className="field-label" htmlFor="email">Email</label>
      <input id="email" className="text" type="email" autoComplete="email" defaultValue={email} readOnly={step === 'code'} />
      {step === 'email' && <button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>}

      {step === 'code' && (
        <>
          <p className="note">If this is your account, a 6-digit code is on its way.</p>
          <label className="field-label" htmlFor="code" style={{ marginTop: 16 }}>Code</label>
          <input
            id="code" className="text code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            placeholder="______" aria-invalid={error === 'wrong-code'}
          />
          {error === 'wrong-code' && <p className="error">Wrong or expired code.</p>}
          {error === 'rate-limited' && <p className="error">Wait a moment, then send a new code.</p>}
          <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <div className="row-actions">
            <button className="link" disabled={resendWaitSeconds > 0}>
              {resendWaitSeconds > 0 ? `Send a new code in ${resendWaitSeconds}s` : 'Send a new code'}
            </button>
          </div>
        </>
      )}
    </Phone>
  );
}
