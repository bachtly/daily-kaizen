import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { coverage, dateOf, dayBounds, dayItems, loggedMs, shiftDate } from '../data/day';
import type { CategoryRow, EntryRow } from '../data/db';
import type { Result } from '../data/request';
import { mondayOf } from '../data/week';
import type { EntryFields, NewEntry } from '../data/writes';
import { EntryEditor } from './EntryEditor';
import { EntryRow as EntryLine } from './EntryRow';
import { LogFab } from './LogFab';
import { LogSheet, type SheetMode } from './LogSheet';
import { deviceZone, writes } from './liveWrites';
import { ConnectionBanner, Phone, type Connection } from './Phone';
import { RefreshedAt } from './RefreshedAt';
import { Skeleton } from './Skeleton';
import { TagPicker } from './TagPicker';
import { useLocalCopy } from './useLocalCopy';
import { useWeekEntries, type WeekLoad } from './useWeekEntries';
import { categoryColour, formatDuration, hhmm, shortDate } from './weekFormat';

/** Phone writes the Day view can make. Each resolves when the Server answers. */
export type DayActions = {
  createEntry: (entry: NewEntry) => Promise<Result<unknown>>;
  editEntry: (id: string, fields: EntryFields) => Promise<Result<unknown>>;
  deleteEntry: (id: string) => Promise<Result<unknown>>;
  setEntryTag: (entryId: string, categoryId: string) => Promise<Result<unknown>>;
};

export type DayViewProps = {
  /** The day shown, `YYYY-MM-DD`. */
  date: string;
  timeZone: string;
  now: number;
  /** Entries that touch the day's week (for the strip and the list). */
  entries: readonly EntryRow[];
  /** Every Entry known on the phone, for the Log sheet's prefill, Recent chips and overlap check. */
  known?: readonly EntryRow[];
  categories: readonly CategoryRow[];
  /** ISO time of the last Local copy refresh; null = never. */
  refreshedAt: string | null;
  connection?: Connection;
  load?: WeekLoad;
  actions: DayActions;
  onPickDay: (date: string) => void;
  onRetry?: () => void;
  /** Start with a sheet, editor or Tag picker open (stories, Nudge). */
  initialSheet?: SheetMode;
  initialText?: string;
  initialEditId?: string;
  initialPickerId?: string;
};

const Chevron = ({ left }: { left?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={left ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
);

const rangeLabel = (monday: string, tz: string) => {
  const a = dayBounds(monday, tz).start;
  const b = dayBounds(shiftDate(monday, 6), tz).start;
  const month = (ms: number) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, month: 'short' }).format(ms);
  const day = (ms: number) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric' }).format(ms);
  return month(a) === month(b) ? `${month(a)} ${day(a)}–${day(b)}` : `${month(a)} ${day(a)} – ${month(b)} ${day(b)}`;
};

/**
 * The Day view (05-ui D5, AC-1.4): a week strip to pick the day, the day's coverage, its Entries in order with
 * Unlogged slots to Fill, inline edit and Tag, and a floating + to log now.
 */
export function DayView({
  date, timeZone: tz, now, entries, known = entries, categories, refreshedAt, connection = 'online', load = 'ready',
  actions: liveActions, onPickDay, onRetry, initialSheet, initialText, initialEditId, initialPickerId,
}: DayViewProps) {
  const [sheet, setSheet] = useState<{ mode: SheetMode; opener: HTMLElement | null } | null>(
    initialSheet ? { mode: initialSheet, opener: null } : null,
  );
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState(initialEditId);
  const [picker, setPicker] = useState<{ id: string; opener: HTMLElement | null } | undefined>(
    initialPickerId ? { id: initialPickerId, opener: null } : undefined,
  );
  // "This Entry was deleted." outlives the row: the refresh that follows removes the editor that would hold it.
  const [gone, setGone] = useState<string | null>(null); // the date it was raised on
  const noticeRef = useRef<HTMLParagraphElement>(null);
  // Layout effect: scroll in the same commit that shows the notice.
  useLayoutEffect(() => { if (gone) noticeRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [gone]);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  const actions = useMemo<DayActions>(() => {
    const watch = <A extends unknown[]>(call: (...a: A) => Promise<Result<unknown>>) => async (...a: A) => {
      setGone(null);
      const r = await call(...a);
      if (!r.ok && r.error === 'entry_not_found') setGone(date);
      return r;
    };
    return {
      createEntry: liveActions.createEntry,
      editEntry: watch(liveActions.editEntry),
      deleteEntry: watch(liveActions.deleteEntry),
      setEntryTag: watch(liveActions.setEntryTag),
    };
  }, [liveActions, date]);

  const online = connection !== 'offline';
  const today = dateOf(now, tz);
  const isToday = date === today;
  const monday = mondayOf(dayBounds(date, tz).start, tz);
  const bounds = useMemo(() => dayBounds(date, tz), [date, tz]);
  const items = useMemo(() => dayItems(entries, bounds, now), [entries, bounds, now]);
  const segments = useMemo(() => coverage(entries, bounds, now), [entries, bounds, now]);
  const logged = useMemo(() => loggedMs(entries, bounds, now), [entries, bounds, now]);
  const week = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = shiftDate(monday, i);
    const b = dayBounds(d, tz);
    return { date: d, start: b.start, logged: loggedMs(entries, b, now), span: b.end - b.start };
  }), [monday, tz, entries, now]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const pickerEntry = picker && entries.find((e) => e.id === picker.id);
  const refreshedLabel = refreshedAt ? hhmm(Date.parse(refreshedAt), tz) : null;
  const span = bounds.end - bounds.start;
  const pct = (ms: number) => `${(ms / span) * 100}%`;
  const go = (d: string) => { setGone(null); setEditId(undefined); onPickDay(d); };
  const lastMonday = mondayOf(now, tz);

  const overlay = sheet ? (
    <LogSheet
      key={sheet.mode.kind === 'now' ? 'now' : `fill:${sheet.mode.start}`}
      mode={sheet.mode} entries={known} timeZone={tz} now={now} connection={connection} loading={load === 'loading'}
      initialText={initialText} returnFocusTo={sheet.opener}
      onSave={actions.createEntry} onSaved={() => { setSheet(null); setSaved(true); }} onClose={() => setSheet(null)}
    />
  ) : pickerEntry ? (
    <TagPicker
      entry={pickerEntry} categories={categories} online={online} returnFocusTo={picker?.opener}
      onPick={(categoryId) => actions.setEntryTag(pickerEntry.id, categoryId)} onClose={() => setPicker(undefined)}
    />
  ) : undefined;

  return (
    <Phone tab="day" busy={load === 'loading'} overlay={overlay} fab={<LogFab onOpen={(opener) => setSheet({ mode: { kind: 'now' }, opener })} />}>
      <ConnectionBanner state={connection} refreshedAt={refreshedLabel} />
      <header className="day-head">
        <div>
          <h1>{isToday ? 'Today' : shortDate(bounds.start, tz, true)}</h1>
          <p className="sub">{isToday ? `${shortDate(bounds.start, tz, true)} · ` : ''}week of {rangeLabel(monday, tz)}</p>
        </div>
        <div className="wnav" role="group" aria-label="Choose week">
          {!isToday && <button className="today-btn" onClick={() => go(today)}>Today</button>}
          <button className="icon-btn" aria-label="Previous week" onClick={() => go(shiftDate(date, -7))}><Chevron left /></button>
          <button
            className="icon-btn" aria-label="Next week" disabled={monday >= lastMonday}
            onClick={() => { const next = shiftDate(date, 7); go(next > today ? today : next); }}
          ><Chevron /></button>
        </div>
      </header>

      <nav className="strip" aria-label="Days of the week">
        {week.map((d) => (
          <button
            key={d.date} disabled={d.date > today} aria-current={d.date === date ? 'date' : undefined}
            className={d.date === today ? 'today' : undefined}
            onClick={() => go(d.date)}
          >
            <span>{new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short' }).format(d.start)}</span>{' '}
            <b>{new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric' }).format(d.start)}</b>
            {' '}
            <span className="sr-only">
              {new Intl.DateTimeFormat('en-GB', { timeZone: tz, month: 'short' }).format(d.start)}{d.date > today ? '' : `, ${formatDuration(d.logged)} logged`}
            </span>
            <span className="fill"><span style={{ width: `${Math.min(d.logged / d.span, 1) * 100}%` }} /></span>
          </button>
        ))}
      </nav>

      {gone === date && <p ref={noticeRef} className="error notice" role="alert">This Entry was deleted.</p>}
      <p className="status day-status" aria-live="polite">{saved ? 'Saved.' : ''}</p>

      {load === 'loading' && <>{[1, 2, 3, 4].map((i) => <Skeleton key={i} style={{ margin: '10px 0' }} />)}</>}
      {load === 'offline-earlier-week' && (
        <div className="empty">
          Earlier days need a connection.
          <div><button className="secondary" style={{ marginTop: 12 }} onClick={onRetry}>Retry</button></div>
        </div>
      )}
      {load === 'session-lost-earlier-week' && <div className="empty">Sign in to see earlier days.</div>}

      {load === 'ready' && (
        <>
          <div className="cover" role="img" aria-label={`Logged ${formatDuration(logged)} of the day`}>
            {segments.map((s) => {
              const c = s.categoryId ? catById.get(s.categoryId) : undefined;
              return <span key={s.start} style={{ left: pct(s.start - bounds.start), width: pct(s.end - s.start), background: c ? categoryColour(c.name) : 'var(--neutral-bar)' }} />;
            })}
          </div>
          <div className="axis" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
          <div className="day-sum"><span>Logged {formatDuration(logged)}</span><RefreshedAt time={refreshedLabel} /></div>

          <section className="day-list" aria-label={`Entries on ${shortDate(bounds.start, tz, true)}`}>
            {items.map((it) => {
              if (it.kind === 'slot') {
                const empty = items.length === 1;
                const to = it.end === now ? 'now' : it.end === bounds.end ? '24:00' : hhmm(it.end, tz);
                return (
                  <div key={`slot-${it.start}`} className="slot">
                    {!empty && <span className="when">{hhmm(it.start, tz)}–{to}</span>}
                    <span className="what">{empty ? 'Nothing logged' : `${formatDuration(it.end - it.start)} unlogged`}</span>
                    <button
                      className="link" aria-label={`Fill ${hhmm(it.start, tz)}–${to}`}
                      onClick={(e) => setSheet({ mode: { kind: 'fill', start: it.start, end: it.end, day: date }, opener: e.currentTarget })}
                    >Fill</button>
                  </div>
                );
              }
              const e = it.entry;
              return e.id === editId ? (
                <EntryEditor
                  key={e.id} entry={e} siblings={entries} now={now} timeZone={tz} online={online}
                  onSave={(fields) => actions.editEntry(e.id, fields)} onDelete={() => actions.deleteEntry(e.id)}
                  onClose={() => setEditId(undefined)}
                />
              ) : (
                <EntryLine
                  key={e.id} entry={e} category={e.category_id ? catById.get(e.category_id) : undefined} timeZone={tz}
                  onEdit={() => setEditId(e.id)} onTag={(opener) => setPicker({ id: e.id, opener })}
                />
              );
            })}
          </section>
        </>
      )}
    </Phone>
  );
}

// ---- live wiring ----

const DATE = /^\d{4}-\d\d-\d\d$/;

/** The Day view wired to the Local copy and the Server. `/` is today, `/day/:date` another day; `?log=now` (Nudge) opens Log now. */
export function DayScreen() {
  const { date: param } = useParams();
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const tz = deviceZone();
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(() => navigator.onLine);
  const { copy, ready, reload } = useLocalCopy();

  const today = dateOf(now, tz);
  const date = param && DATE.test(param) && param < today ? param : today;
  const monday = mondayOf(dayBounds(date, tz).start, tz);
  const week = useWeekEntries({ monday, now, tz, copy, copyReady: ready, reload });
  // A Nudge opens Log now once; the flag leaves the URL so going back or refreshing doesn't reopen it.
  const [nudged] = useState(() => search.get('log') === 'now');
  useEffect(() => { if (nudged) setSearch({}, { replace: true }); }, [nudged, setSearch]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      clearInterval(tick);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const actions: DayActions = {
    createEntry: async (entry) => week.afterWrite(await writes.createEntry(entry)),
    editEntry: async (id, fields) => week.afterWrite(await writes.editEntry(id, fields)),
    deleteEntry: async (id) => week.afterWrite(await writes.deleteEntry(id)),
    setEntryTag: async (entryId, categoryId) => week.afterWrite(await writes.setEntryTag(entryId, categoryId)),
  };
  const known = week.inLocalCopy ? copy.entries : [...copy.entries, ...week.entries];

  return (
    <DayView
      key={date} date={date} timeZone={tz} now={now} entries={week.entries} known={known} categories={copy.categories}
      refreshedAt={copy.refreshedAt} load={week.load} actions={actions}
      connection={week.sessionLost ? 'signed-out' : online ? 'online' : 'offline'}
      initialSheet={nudged && date === today ? { kind: 'now' } : undefined}
      onPickDay={(d) => void navigate(d === today ? '/' : `/day/${d}`)}
      onRetry={week.retry}
    />
  );
}
