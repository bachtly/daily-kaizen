import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalCopy } from '../data/localCopy';
import type { Result } from '../data/request';
import type { PushEnv, PushOutcome } from '../data/push';

const readLocalCopy = vi.fn<() => Promise<LocalCopy>>();
const saveSettings = vi.fn<(p: unknown) => Promise<Result<unknown>>>();
const upsertPushSubscription = vi.fn<(s: unknown) => Promise<Result<unknown>>>();
const getTimings = vi.fn(async (kind: string) => (kind === 'save' ? [300, 500] : [800]));
const openPush = vi.fn<(e: PushEnv, k: string | undefined, r: unknown) => Promise<PushOutcome>>();
const turnOnPush = vi.fn<(e: PushEnv, k: string | undefined, r: unknown) => Promise<PushOutcome>>();
vi.mock('../data/localCopy', () => ({ readLocalCopy }));
vi.mock('../data/timings', async (orig) => ({ ...(await orig<typeof import('../data/timings')>()), getTimings }));
vi.mock('../data/push', async (orig) => ({ ...(await orig<typeof import('../data/push')>()), openPush, turnOnPush }));
vi.mock('./liveWrites', () => ({ writes: { saveSettings, upsertPushSubscription }, deviceZone: () => 'UTC' }));
const { emitCopyChanged } = await import('../data/copyChanged');
const { SettingsScreen, SettingsView } = await import('./SettingsScreen');

const copy = (): LocalCopy => ({
  entries: [], categories: [], reviews: [], refreshedAt: null,
  settings: { time_zone: 'UTC', quiet_start: '22:00:00', quiet_end: '06:30:00', nudge_gap_hours: 3 },
});
const mount = () => render(<MemoryRouter><SettingsScreen /></MemoryRouter>);
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const loaded = () => waitFor(() => expect(field('From').value).toBe('22:00'));

beforeEach(() => {
  readLocalCopy.mockReset().mockResolvedValue(copy());
  saveSettings.mockReset();
  openPush.mockReset().mockResolvedValue({ state: 'off' });
  turnOnPush.mockReset();
});
afterEach(cleanup);

describe('SettingsView', () => {
  it('shows when the offline data is from, and no Off or button while push is being checked', () => {
    const { rerender } = render(<MemoryRouter><SettingsView connection="offline" refreshedAt="14:02" loading={{ push: true }} /></MemoryRouter>);
    expect(screen.getByText(/Showing data from 14:02/)).toBeTruthy();
    expect(screen.queryByText('Off')).toBeNull();
    expect(screen.queryByText('Turn on notifications')).toBeNull();
    rerender(<MemoryRouter><SettingsView connection="offline" refreshedAt="14:02" push="off" /></MemoryRouter>);
    expect((screen.getByText('Turn on notifications') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('SettingsScreen loading', () => {
  it('shows no default (Push: Off, 23:00, speed dashes) before the reads resolve, then the real values', async () => {
    let resolveCopy!: (c: LocalCopy) => void;
    let resolvePush!: (o: PushOutcome) => void;
    readLocalCopy.mockReturnValue(new Promise((r) => { resolveCopy = r; }));
    openPush.mockReturnValue(new Promise((r) => { resolvePush = r; }));
    mount();
    expect(document.querySelector('main')?.getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByText('Off')).toBeNull();
    expect(screen.queryByText('Turn on notifications')).toBeNull();
    expect(screen.queryByLabelText('From')).toBeNull();
    expect(screen.queryByText(/Typical speed/)).toBeNull();
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    resolveCopy(copy());
    resolvePush({ state: 'on' });
    await loaded();
    await screen.findByText('On');
    await screen.findByText(/Typical speed/);
    expect(document.querySelector('main')?.getAttribute('aria-busy')).toBeNull();
    expect(document.querySelector('.skeleton')).toBeNull();
  });
});

describe('SettingsScreen with an empty Local copy', () => {
  it('keeps Quiet hours as a skeleton and Save disabled until settings arrive', async () => {
    readLocalCopy.mockResolvedValue({ ...copy(), settings: null });
    mount();
    await screen.findByText('Off');
    expect(screen.queryByLabelText('From')).toBeNull();
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(true);
    readLocalCopy.mockResolvedValue(copy());
    emitCopyChanged();
    await loaded();
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('SettingsScreen refresh time', () => {
  it('shows the new offline time after the Local copy changes', async () => {
    readLocalCopy.mockResolvedValue({ ...copy(), refreshedAt: '2026-11-04T14:02:00Z' });
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    mount();
    await screen.findByText(/Showing data from 14:02/);
    readLocalCopy.mockResolvedValue({ ...copy(), refreshedAt: '2026-11-04T15:30:00Z' });
    emitCopyChanged();
    await screen.findByText(/Showing data from 15:30/);
    online.mockRestore();
  });
});

describe('SettingsScreen', () => {
  it('shows the saved Quiet hours and the p95 save and refresh times', async () => {
    mount();
    await loaded();
    expect(field('To').value).toBe('06:30');
    await screen.findByText(/save 500 ms · refresh 800 ms/);
  });

  it('opens by re-sending the subscription (openPush) and shows its state', async () => {
    openPush.mockResolvedValue({ state: 'on' });
    mount();
    await screen.findByText('On');
    expect(openPush).toHaveBeenCalledOnce();
  });

  it('turns on notifications on tap and shows denied', async () => {
    turnOnPush.mockResolvedValue({ state: 'denied' });
    mount();
    fireEvent.click(await screen.findByText('Turn on notifications'));
    await screen.findByText(/Push is off\. Turn it on in iOS Settings/);
    expect(turnOnPush).toHaveBeenCalledOnce();
  });

  it('shows a failed turn-on and keeps the button', async () => {
    turnOnPush.mockResolvedValue({ state: 'off', error: 'unknown' });
    mount();
    fireEvent.click(await screen.findByText('Turn on notifications'));
    await screen.findByText('Needs a connection.');
    expect(screen.getByText('Turn on notifications')).toBeTruthy();
  });

  it('saves the hours and says Saved only after the Server confirms', async () => {
    let done!: (r: Result<unknown>) => void;
    saveSettings.mockReturnValue(new Promise((r) => { done = r; }));
    mount();
    await loaded();
    fireEvent.change(field('To'), { target: { value: '07:00' } });
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Saving…');
    expect(screen.queryByText('Saved.')).toBeNull();
    expect(saveSettings).toHaveBeenCalledWith({ quiet_start: '22:00', quiet_end: '07:00' });
    done({ ok: true, data: null });
    await screen.findByText('Saved.');
  });

  it('refuses equal hours before sending, and shows the Server refusal', async () => {
    mount();
    await loaded();
    fireEvent.change(field('To'), { target: { value: '22:00' } });
    expect(screen.getByText('Start and end must differ.')).toBeTruthy();
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(true);
    expect(saveSettings).not.toHaveBeenCalled();

    fireEvent.change(field('To'), { target: { value: '05:00' } });
    saveSettings.mockResolvedValue({ ok: false, error: 'quiet_hours_equal' });
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Start and end must differ.');
    expect(screen.queryByText('Saved.')).toBeNull();
  });

  it('keeps the edit and says so when the result is unknown; session loss shows the banner', async () => {
    saveSettings.mockResolvedValueOnce({ ok: false, error: 'unknown' });
    mount();
    await loaded();
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Needs a connection.');
    saveSettings.mockResolvedValueOnce({ ok: false, error: 'session_lost' });
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText(/Signed out/);
    expect(field('From').value).toBe('22:00');
  });
});

describe('SettingsView', () => {
  it('disables Save and Turn on while offline', () => {
    render(<MemoryRouter><SettingsView connection="offline" /></MemoryRouter>);
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Turn on notifications') as HTMLButtonElement).disabled).toBe(true);
  });
  it('hides the button when not on the Home Screen', () => {
    render(<MemoryRouter><SettingsView push="not-installed" /></MemoryRouter>);
    expect(screen.queryByText('Turn on notifications')).toBeNull();
    expect(screen.getByText(/Add daily-kaizen to your Home Screen first/)).toBeTruthy();
  });
});
