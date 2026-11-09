import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { sendCode, verifyCode } from '../data/auth';
import { InstallHelp } from './InstallHelp';
import { detectInstallBrowser, type InstallBrowser } from './installBrowser';
import { Phone } from './Phone';

const RESEND_WAIT_SECONDS = 60;

export type SignInError = 'wrong-code' | 'rate-limited' | 'offline' | 'server';

export type SignInViewProps = {
  step?: 'email' | 'code';
  email?: string;
  busy?: boolean;
  error?: SignInError;
  /** Set when opened in a browser instead of the home-screen app: which steps to show. */
  installHelp?: InstallBrowser;
  resendWaitSeconds?: number;
  onEmailChange?: (email: string) => void;
  onCodeChange?: (code: string) => void;
  onSendCode?: () => void;
  onVerify?: () => void;
};

const ERROR_TEXT: Record<SignInError, string> = {
  'wrong-code': 'Wrong or expired code.',
  'rate-limited': 'Wait a moment, then send a new code.',
  offline: 'Needs a connection. Try again.',
  server: "Couldn't sign in. Try again.",
};

/** The Sign in screen, props only (UC-6). Same message for any email, so it reveals nothing (AC-7.2). */
export function SignInView({
  step = 'email', email = '', busy, error, installHelp, resendWaitSeconds = 0,
  onEmailChange, onCodeChange, onSendCode, onVerify,
}: SignInViewProps) {
  if (installHelp) return <InstallHelp browser={installHelp} />;
  const submit = (action?: () => void) => (e: FormEvent) => {
    e.preventDefault();
    action?.();
  };
  return (
    <Phone>
      <h1>daily-kaizen</h1>
      <form onSubmit={submit(step === 'email' ? onSendCode : onVerify)}>
        <label className="field-label" htmlFor="email">Email</label>
        <input
          id="email" className="text" type="email" autoComplete="email" required
          {...(onEmailChange ? { value: email, onChange: (e) => onEmailChange(e.target.value) } : { defaultValue: email })}
          readOnly={step === 'code'}
        />
        {step === 'email' && (
          <>
            {error && <p className="error" role="alert">{ERROR_TEXT[error]}</p>}
            <button className="primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
          </>
        )}

        {step === 'code' && (
          <>
            <p className="note" role="status">If this is your account, a 6-digit code is on its way.</p>
            <label className="field-label" htmlFor="code" style={{ marginTop: 16 }}>Code</label>
            <input
              id="code" className="text code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              placeholder="______" aria-invalid={error === 'wrong-code'}
              onChange={onCodeChange ? (e) => onCodeChange(e.target.value.replace(/\D/g, '')) : undefined}
            />
            {error && <p className="error" role="alert">{ERROR_TEXT[error]}</p>}
            <button className="primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            <div className="row-actions">
              <button className="link" type="button" disabled={resendWaitSeconds > 0 || busy} onClick={onSendCode}>
                {resendWaitSeconds > 0 ? `Send a new code in ${resendWaitSeconds}s` : 'Send a new code'}
              </button>
            </div>
          </>
        )}
      </form>
    </Phone>
  );
}

/** iOS home-screen app, or any installed display mode. The dev server counts as installed. */
function isStandalone(): boolean {
  if (import.meta.env.DEV) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

/** The wired Sign in screen: send code, verify, then go to the Log form. */
export function SignInScreen({ onSignedIn }: { onSignedIn?: () => void } = {}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SignInError>();
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send() {
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(undefined);
    const r = await sendCode(email.trim());
    setBusy(false);
    if (r.ok) {
      setStep('code');
      setWait(RESEND_WAIT_SECONDS);
    } else {
      setError(r.error === 'unknown' ? 'offline' : 'server');
    }
  }

  async function verify() {
    if (busy || code.length !== 6) return;
    setBusy(true);
    setError(undefined);
    const r = await verifyCode(email.trim(), code);
    setBusy(false);
    if (r.ok) {
      onSignedIn?.();
      void navigate('/', { replace: true });
    } else {
      setError(r.error === 'invalid_code' ? 'wrong-code' : r.error === 'unknown' ? 'offline' : 'server');
    }
  }

  return (
    <SignInView
      step={step} email={email} busy={busy} error={error} resendWaitSeconds={wait}
      installHelp={isStandalone() ? undefined : detectInstallBrowser(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)}
      onEmailChange={setEmail} onCodeChange={setCode} onSendCode={() => void send()} onVerify={() => void verify()}
    />
  );
}
