import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendCode = vi.fn();
const verifyCode = vi.fn();
vi.mock('../data/auth', () => ({ sendCode, verifyCode }));
const { SignInScreen } = await import('./SignInScreen');

const mount = (onSignedIn?: () => void) =>
  render(<MemoryRouter><SignInScreen onSignedIn={onSignedIn} /></MemoryRouter>);

const RESEND_WAIT_SECONDS = 60;

async function toCodeStep() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'me@example.com' } });
  fireEvent.click(screen.getByText('Send code'));
  await screen.findByLabelText('Code');
}

beforeEach(() => {
  sendCode.mockReset();
  verifyCode.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SignInScreen', () => {
  it('signs in from a browser too, with a link to the Home Screen steps', () => {
    mount();
    expect(screen.getByText('Send code')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Add it to your Home Screen' }).getAttribute('href')).toBe('/install');
  });

  it('shows the same neutral message once the code is sent', async () => {
    sendCode.mockResolvedValue({ ok: true });
    mount();
    await toCodeStep();
    expect(screen.getByText('A 6-digit code is on its way.')).toBeTruthy();
    expect(sendCode).toHaveBeenCalledWith('me@example.com');
  });

  it('keeps the email step and says so when offline', async () => {
    sendCode.mockResolvedValue({ ok: false, error: 'unknown' });
    mount();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'me@example.com' } });
    fireEvent.click(screen.getByText('Send code'));
    expect(await screen.findByText('Needs a connection. Try again.')).toBeTruthy();
    expect(screen.queryByLabelText('Code')).toBeNull();
  });

  it('offers a new code only after 60 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    sendCode.mockResolvedValue({ ok: true });
    mount();
    await toCodeStep();
    const resend = () => screen.getByText(/Send a new code/) as HTMLButtonElement;
    expect(resend().disabled).toBe(true);
    expect(resend().textContent).toContain(`${RESEND_WAIT_SECONDS}s`);
    for (let i = 0; i < RESEND_WAIT_SECONDS; i++) await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(resend().disabled).toBe(false);
    expect(resend().textContent).toBe('Send a new code');
  });

  it('shows "Wrong or expired code." for a bad code', async () => {
    sendCode.mockResolvedValue({ ok: true });
    verifyCode.mockResolvedValue({ ok: false, error: 'invalid_code' });
    mount();
    await toCodeStep();
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Sign in'));
    expect(await screen.findByText('Wrong or expired code.')).toBeTruthy();
  });

  it('signs in with a good code and leaves for the Log form', async () => {
    sendCode.mockResolvedValue({ ok: true });
    verifyCode.mockResolvedValue({ ok: true });
    const done = vi.fn();
    mount(done);
    await toCodeStep();
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Sign in'));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(verifyCode).toHaveBeenCalledWith('me@example.com', '123456');
  });
});
