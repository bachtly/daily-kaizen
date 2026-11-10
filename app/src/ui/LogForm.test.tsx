import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Result } from '../data/request';
import type { NewEntry } from '../data/writes';
import { LogFormView } from './LogForm';

const NOW = Date.parse('2026-11-04T10:52:00Z');
const entries = [
  { id: '1', text: 'Standup', started_at: '2026-11-04T09:25:00Z', ended_at: '2026-11-04T09:40:00Z', created_at: '2026-11-04T09:40:00Z' },
];

const ok: Result<unknown> = { ok: true, data: null };
function mount(onSave: (e: NewEntry) => Promise<Result<unknown>>, extra = {}) {
  return render(
    <MemoryRouter>
      <LogFormView entries={entries} timeZone="UTC" now={NOW} onSave={onSave} {...extra} />
    </MemoryRouter>,
  );
}
const type = (v: string) => fireEvent.change(screen.getByLabelText('Activity'), { target: { value: v } });

afterEach(cleanup);

describe('LogFormView loading', () => {
  it('shows no From, Recent chips or enabled Save until the Local copy is read, but lets me type', () => {
    mount(vi.fn(), { loading: true });
    expect(screen.queryByLabelText('From')).toBeNull();
    expect(screen.queryByText('Standup')).toBeNull();
    expect(document.querySelector('main')?.getAttribute('aria-busy')).toBe('true');
    type('Reading');
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText('To')).toBeTruthy();
  });
});

describe('LogFormView', () => {
  it('prefills From with the latest end and To with now (AC-1.1)', () => {
    mount(vi.fn());
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('09:40');
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('10:52');
    expect(screen.getByText('now')).toBeTruthy();
  });

  it('saves with the prefilled times and shows Saved only after the Server confirms (AC-2.1)', async () => {
    let resolve!: (r: Result<unknown>) => void;
    const onSave = vi.fn<(e: NewEntry) => Promise<Result<unknown>>>(() => new Promise((r) => (resolve = r)));
    mount(onSave);
    type('Reading');
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('Saving…')).toBeTruthy();
    expect(screen.queryByText('Saved.')).toBeNull();
    resolve(ok);
    await screen.findByText('Saved.');
    const sent = onSave.mock.calls[0][0];
    expect(sent).toMatchObject({ text: 'Reading', started_at: '2026-11-04T09:40:00.000Z', ended_at: '2026-11-04T10:52:00.000Z', time_zone: 'UTC' });
    expect((screen.getByLabelText('Activity') as HTMLInputElement).value).toBe('');
  });

  it('keeps the text and resends with the same id after an unknown result (AC-2.2)', async () => {
    const onSave = vi.fn<(e: NewEntry) => Promise<Result<unknown>>>()
      .mockResolvedValueOnce({ ok: false, error: 'unknown' })
      .mockResolvedValueOnce(ok);
    mount(onSave);
    type('Reading');
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText(/Needs a connection/);
    expect((screen.getByLabelText('Activity') as HTMLInputElement).value).toBe('Reading');
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Saved.');
    expect(onSave.mock.calls[1][0].id).toBe(onSave.mock.calls[0][0].id);
  });

  it('uses a new id and form_opened_at for the next Entry once the text is empty', async () => {
    const onSave = vi.fn<(e: NewEntry) => Promise<Result<unknown>>>(async () => ok);
    mount(onSave);
    type('One');
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Saved.');
    type('Two');
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave.mock.calls[1][0].id).not.toBe(onSave.mock.calls[0][0].id);
  });

  it('sets form_opened_at when the form is shown, not at the first keystroke (NFR-1)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));
      const onSave = vi.fn<(e: NewEntry) => Promise<Result<unknown>>>(async () => ok);
      mount(onSave);
      vi.setSystemTime(new Date('2026-11-04T10:00:30Z'));
      type('Reading');
      fireEvent.click(screen.getByText('Save'));
      await waitFor(() => expect(onSave).toHaveBeenCalled());
      expect(onSave.mock.calls[0][0].form_opened_at).toBe('2026-11-04T10:00:00.000Z');
    } finally {
      vi.useRealTimers();
    }
  });

  it('starts a fresh form with new prefill when shown again with empty text', () => {
    mount(vi.fn());
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '08:00' } });
    document.dispatchEvent(new Event('visibilitychange'));
    return waitFor(() => expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('09:40'));
  });

  it('shows a new id after clearing the text', async () => {
    const onSave = vi.fn<(e: NewEntry) => Promise<Result<unknown>>>(async () => ok);
    mount(onSave, { initialText: 'draft' });
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Saved.');
    const first = onSave.mock.calls[0][0];
    type('again');
    type('');
    type('third');
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave.mock.calls[1][0].id).not.toBe(first.id);
  });

  it('shows session lost as the banner and keeps the text', async () => {
    mount(vi.fn(async () => ({ ok: false, error: 'session_lost' }) as Result<unknown>));
    type('Reading');
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText(/Signed out/);
    expect((screen.getByLabelText('Activity') as HTMLInputElement).value).toBe('Reading');
  });

  it('maps field error keys to messages on the field', async () => {
    mount(vi.fn(async () => ({ ok: false, error: 'entry_text_empty' }) as Result<unknown>));
    type('Reading');
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Write what you did.');
  });

  it('blocks Save and explains when From is not before To', () => {
    mount(vi.fn());
    type('Reading');
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '09:00' } });
    expect(screen.getByText('From must be before To.')).toBeTruthy();
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('reads a To later than now as yesterday, so last night can be backfilled (#46)', async () => {
    const onSave = vi.fn<(e: NewEntry) => Promise<Result<unknown>>>(async () => ok);
    const lastNight = [{ id: '1', text: 'Dinner', started_at: '2026-11-03T18:00:00Z', ended_at: '2026-11-03T19:00:00Z', created_at: '2026-11-03T19:00:00Z' }];
    mount(onSave, { entries: lastNight });
    expect(screen.getAllByText('yesterday')).toHaveLength(1); // From, prefilled from last night
    type('Reading');
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '21:30' } });
    expect(screen.getAllByText('yesterday')).toHaveLength(2);
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Saved.');
    expect(onSave.mock.calls[0][0]).toMatchObject({ started_at: '2026-11-03T19:00:00.000Z', ended_at: '2026-11-03T21:30:00.000Z' });
  });

  it('puts From on the day before To when it is not before To, for an Entry across midnight', () => {
    const onSave = vi.fn<(e: NewEntry) => Promise<Result<unknown>>>(async () => ok);
    mount(onSave, { entries: [] });
    type('Sleep');
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '07:00' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '23:00' } });
    expect(screen.getByText('yesterday')).toBeTruthy();
    fireEvent.click(screen.getByText('Save'));
    expect(onSave.mock.calls[0][0]).toMatchObject({ started_at: '2026-11-03T23:00:00.000Z', ended_at: '2026-11-04T07:00:00.000Z' });
  });

  it('warns about an overlap but still saves (AC-1.2)', async () => {
    const onSave = vi.fn<(e: NewEntry) => Promise<Result<unknown>>>(async () => ok);
    mount(onSave);
    type('Call');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '09:30' } });
    expect(screen.getByText(/Overlaps "Standup 09:25–09:40"/)).toBeTruthy();
    fireEvent.click(screen.getByText('Save'));
    await screen.findByText('Saved.');
  });

  it('hides Recent when there are no Entries and fills the text from a chip', () => {
    mount(vi.fn(), { entries: [] });
    expect(screen.queryByLabelText('Recent')).toBeNull();
    cleanup();
    mount(vi.fn());
    fireEvent.click(screen.getByRole('button', { name: 'Standup' }));
    expect((screen.getByLabelText('Activity') as HTMLInputElement).value).toBe('Standup');
  });
});
