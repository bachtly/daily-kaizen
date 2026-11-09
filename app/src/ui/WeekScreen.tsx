import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { CategoryRow, EntryRow } from '../data/db';
import { onCopyChanged } from '../data/copyChanged';
import { fetchWeek, readLocalCopy, refresh, type LocalCopy } from '../data/localCopy';
import type { Result } from '../data/request';
import { mondayOf, weekBounds, weekTotals, zonedParts } from '../data/week';
import type { EntryFields } from '../data/writes';
import { CategoryTotals } from './CategoryTotals';
import { EntryEditor } from './EntryEditor';
import { EntryRow as EntryLine } from './EntryRow';
import { deviceZone, liveWindow, writes } from './liveWrites';
import { ConnectionBanner, Phone, type Connection } from './Phone';
import { RefreshedAt } from './RefreshedAt';
import { ReviewDoneButton } from './ReviewDoneButton';
import { SuggestedCategoryCard } from './SuggestedCategoryCard';
import { TagPicker } from './TagPicker';
import { hhmm } from './weekFormat';

/** Phone writes the page can make. Each resolves when the Server answers. */
export type WeekActions = {
  editEntry: (id: string, fields: EntryFields) => Promise<Result<unknown>>;
  deleteEntry: (id: string) => Promise<Result<unknown>>;
  setEntryTag: (entryId: string, categoryId: string) => Promise<Result<unknown>>;
  approveCategory: (categoryId: string) => Promise<Result<unknown>>;
  rejectCategory: (categoryId: string) => Promise<Result<unknown>>;
};

export type WeekViewProps = {
  /** The week shown: its Monday, `YYYY-MM-DD`. */
  monday: string;
  timeZone: string;
  now: number;
  isCurrentWeek: boolean;
  /** Entries that touch this week. */
  entries: readonly EntryRow[];
  categories: readonly CategoryRow[];
  /** `undefined` when unknown (an earlier week outside the Local copy): the badge and button are hidden. */
  reviewDone?: boolean;
  /** ISO time of the last Local copy refresh; null = never. */
  refreshedAt: string | null;
  connection?: Connection;
  load?: 'ready' | 'loading' | 'offline-earlier-week' | 'session-lost-earlier-week';
  onPrev?: () => void;
  onNext?: () => void;
  onRetry?: () => void;
  onLogSomething?: () => void;
  onReviewDone?: () => Promise<Result<unknown>>;
  actions?: WeekActions;
  /** Entries that approving each Suggested category would move, by category id. */
  moveCounts?: Record<string, number>;
  /** Start with a row expanded or the Tag picker open (stories). */
  initialEditId?: string;
  initialPickerId?: string;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const weekLabel = (monday: string) => {
  const [, m, d] = monday.split('-').map(Number);
  return `Week of ${d} ${MONTHS[m - 1]}`;
};
const dayLabel = (ms: number, tz: string) => {
  const p = zonedParts(ms, tz);
  return `${DAYS[p.weekday]} ${p.day} ${MONTHS[p.month - 1]}`;
};
const shiftMonday = (monday: string, days: number) => {
  const [y, m, d] = monday.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/** This week page: time per Category, Suggested categories, Entries by day with inline edit and Tag, Review done (UC-4). */
export function WeekView({
  monday, timeZone, now, isCurrentWeek, entries, categories, reviewDone, refreshedAt,
  connection = 'online', load = 'ready', onPrev, onNext, onRetry, onLogSomething, onReviewDone,
  actions: liveActions, moveCounts = {}, initialEditId, initialPickerId,
}: WeekViewProps) {
  // "This Entry was deleted." outlives the row: the refresh that follows removes the editor that would hold it.
  const [gone, setGone] = useState<string | null>(null); // the Monday it was raised on
  const actions = useMemo<WeekActions | undefined>(() => {
    if (!liveActions) return undefined;
    const watch = (call: (...a: never[]) => Promise<Result<unknown>>) => async (...a: never[]) => {
      setGone(null);
      const r = await call(...a);
      if (!r.ok && r.error === 'entry_not_found') setGone(monday);
      return r;
    };
    return {
      editEntry: watch(liveActions.editEntry as never) as WeekActions['editEntry'],
      deleteEntry: watch(liveActions.deleteEntry as never) as WeekActions['deleteEntry'],
      setEntryTag: watch(liveActions.setEntryTag as never) as WeekActions['setEntryTag'],
      approveCategory: liveActions.approveCategory,
      rejectCategory: liveActions.rejectCategory,
    };
  }, [liveActions, monday]);
  const [editId, setEditId] = useState(initialEditId);
  const [picker, setPicker] = useState<{ id: string; opener: HTMLElement | null } | undefined>(
    initialPickerId ? { id: initialPickerId, opener: null } : undefined,
  );
  const online = connection !== 'offline';
  const bounds = useMemo(() => weekBounds(monday, timeZone), [monday, timeZone]);
  const totals = useMemo(() => weekTotals(entries, bounds, now), [entries, bounds, now]);
  const refreshedLabel = refreshedAt ? hhmm(Date.parse(refreshedAt), timeZone) : null;
  const days = useMemo(() => {
    const out: { label: string; entries: EntryRow[] }[] = [];
    for (const e of [...entries].sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at))) {
      const label = dayLabel(Math.max(Date.parse(e.started_at), bounds.start), timeZone);
      const last = out[out.length - 1];
      if (last?.label === label) last.entries.push(e);
      else out.push({ label, entries: [e] });
    }
    return out;
  }, [entries, bounds, timeZone]);
  const suggested = categories.filter((c) => c.status === 'suggested');
  const pickerEntry = picker && entries.find((e) => e.id === picker.id);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <Phone
      tab="week"
      overlay={pickerEntry && actions && (
        <TagPicker
          entry={pickerEntry} categories={categories} online={online} returnFocusTo={picker?.opener}
          onPick={(categoryId) => actions.setEntryTag(pickerEntry.id, categoryId)} onClose={() => setPicker(undefined)}
        />
      )}
    >
      <ConnectionBanner state={connection} refreshedAt={refreshedLabel ?? '–'} />
      <header className="week-header">
        <div className="week-picker" role="group" aria-label="Choose week">
          <button aria-label="Previous week" onClick={onPrev}>‹</button>
          <h1>{weekLabel(monday)}</h1>
          <button aria-label="Next week" onClick={onNext} disabled={isCurrentWeek}>›</button>
        </div>
        <div className="week-meta">
          {reviewDone !== undefined && (
            <span className={reviewDone ? 'badge done' : 'badge'}>{reviewDone ? 'Review done ✓' : 'Not reviewed'}</span>
          )}
          <RefreshedAt time={refreshedLabel} />
        </div>
      </header>

      {gone === monday && <p className="error notice" role="alert">This Entry was deleted.</p>}

      {load === 'loading' && <>{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" />)}</>}
      {load === 'offline-earlier-week' && (
        <div className="empty">
          Earlier weeks need a connection.
          <div><button className="secondary" style={{ marginTop: 12 }} onClick={onRetry}>Retry</button></div>
        </div>
      )}

      {load === 'session-lost-earlier-week' && <div className="empty">Sign in to see earlier weeks.</div>}

      {load === 'ready' && (
        <>
          <CategoryTotals totals={totals} categories={categories} hasEntries={entries.length > 0} />

          {actions && suggested.map((c) => (
            <SuggestedCategoryCard
              key={c.id} category={c} moveCount={moveCounts[c.id] ?? 0} online={online}
              onApprove={() => actions.approveCategory(c.id)} onReject={() => actions.rejectCategory(c.id)}
            />
          ))}

          {entries.length === 0 && (
            <div className="empty">
              Nothing logged this week yet.
              {isCurrentWeek && (
                <div><button className="secondary" style={{ marginTop: 12 }} onClick={onLogSomething}>Log something</button></div>
              )}
            </div>
          )}

          {days.map((day) => (
            <section key={day.label} className="panel" aria-label={day.label}>
              <h2 className="day">{day.label}</h2>
              {day.entries.map((e) =>
                actions && e.id === editId ? (
                  <EntryEditor
                    key={e.id} entry={e} siblings={entries} now={now} online={online}
                    onSave={(fields) => actions.editEntry(e.id, fields)} onDelete={() => actions.deleteEntry(e.id)}
                    onClose={() => setEditId(undefined)}
                  />
                ) : (
                  <EntryLine
                    key={e.id} entry={e} category={e.category_id ? catById.get(e.category_id) : undefined} timeZone={timeZone}
                    onEdit={() => setEditId(e.id)} onTag={(opener) => setPicker({ id: e.id, opener })}
                  />
                ),
              )}
            </section>
          ))}

          {entries.length > 0 && reviewDone === false && onReviewDone && (
            <ReviewDoneButton onMark={onReviewDone} online={connection === 'online'} />
          )}
        </>
      )}
    </Phone>
  );
}

// ---- live wiring: Local copy for this and the previous week, a fetch for earlier ones ----

const EMPTY: LocalCopy = { entries: [], categories: [], settings: null, reviews: [], refreshedAt: null };
const MONDAY = /^\d{4}-\d\d-\d\d$/;

/** The Week screen wired to the Local copy and the Server. `/week` is the current week, `/week/:monday` another one. */
export function WeekScreen(_props: { isCurrentWeek?: boolean }) {
  const { monday: param } = useParams();
  const navigate = useNavigate();
  const tz = deviceZone();
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(() => navigator.onLine);
  const [copy, setCopy] = useState<LocalCopy>(EMPTY);
  const [copyReady, setCopyReady] = useState(false);
  const [fetched, setFetched] = useState<{ monday: string; entries: EntryRow[] } | null>(null);
  // The failure belongs to one week: navigating away leaves it behind.
  const [failure, setFailure] = useState<{ monday: string; kind: 'offline' | 'session-lost' } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sessionLost, setSessionLost] = useState(false);

  const currentMonday = mondayOf(now, tz);
  const monday = param && MONDAY.test(param) ? param : currentMonday;
  const inLocalCopy = monday >= shiftMonday(currentMonday, -7);

  const reload = async () => {
    try {
      setCopy(await readLocalCopy());
    } catch {
      // Storage unavailable: keep showing what we have.
    }
    setCopyReady(true);
  };
  useEffect(() => {
    let live = true;
    Promise.resolve()
      .then(() => readLocalCopy())
      .then((c) => { if (live) setCopy(c); }, () => {})
      .then(() => { if (live) setCopyReady(true); });
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const unsub = onCopyChanged(() => void reload());
    return () => {
      live = false;
      unsub();
      clearInterval(tick);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Earlier weeks are fetched for that week and not stored.
  useEffect(() => {
    if (inLocalCopy) return;
    const ctl = new AbortController();
    const b = weekBounds(monday, tz);
    void fetchWeek({ start: new Date(b.start).toISOString(), end: new Date(b.end).toISOString() }).then((r) => {
      if (ctl.signal.aborted) return;
      if (r.ok) { setFetched({ monday, entries: r.data }); setFailure(null); setSessionLost(false); }
      else {
        setFailure({ monday, kind: r.error === 'session_lost' ? 'session-lost' : 'offline' });
        if (r.error === 'session_lost') setSessionLost(true); // stays up when moving to another week
      }
    });
    return () => ctl.abort();
  }, [inLocalCopy, monday, tz, attempt]);

  const bounds = weekBounds(monday, tz);
  const fail = failure?.monday === monday ? failure : null;
  const haveEarlier = !inLocalCopy && fetched?.monday === monday;
  const entries = inLocalCopy
    ? copy.entries.filter((e) => Date.parse(e.started_at) < bounds.end && Date.parse(e.ended_at) > bounds.start)
    : haveEarlier ? fetched.entries : [];
  const load: WeekViewProps['load'] =
    inLocalCopy ? (copyReady ? 'ready' : 'loading')
    : haveEarlier ? 'ready'
    : fail?.kind === 'offline' ? 'offline-earlier-week'
    : fail?.kind === 'session-lost' ? 'session-lost-earlier-week' : 'loading';
  // After a write: a confirmed one already refreshed the Local copy; a refusal that means "your view is stale" refreshes it here.
  const STALE = ['entry_not_found', 'category_not_active', 'category_already_decided'];
  const afterWrite = async (r: Result<unknown>) => {
    if (!r.ok && STALE.includes(r.error)) await refresh(liveWindow(Date.now(), tz));
    if (r.ok || STALE.includes(r.error)) {
      await reload();
      if (!inLocalCopy) setAttempt((a) => a + 1); // an earlier week is read again with the same GET
    }
    if (r.ok) setSessionLost(false);
    else if (r.error === 'session_lost') setSessionLost(true);
    return r;
  };
  const actions: WeekActions = {
    editEntry: async (id, fields) => afterWrite(await writes.editEntry(id, fields)),
    deleteEntry: async (id) => afterWrite(await writes.deleteEntry(id)),
    setEntryTag: async (entryId, categoryId) => afterWrite(await writes.setEntryTag(entryId, categoryId)),
    approveCategory: async (id) => afterWrite(await writes.approveCategory(id)),
    rejectCategory: async (id) => afterWrite(await writes.rejectCategory(id)),
  };
  const moveCounts: Record<string, number> = {};
  for (const e of copy.entries) {
    if (e.suggested_category_id && e.tag_source !== 'me') moveCounts[e.suggested_category_id] = (moveCounts[e.suggested_category_id] ?? 0) + 1;
  }
  const goto = (m: string) => void navigate(m === currentMonday ? '/week' : `/week/${m}`);

  return (
    <WeekView
      monday={monday} timeZone={tz} now={now} isCurrentWeek={monday >= currentMonday}
      entries={entries} categories={copy.categories} refreshedAt={copy.refreshedAt}
      reviewDone={inLocalCopy ? copy.reviews.some((r) => r.week_start === monday) : undefined}
      connection={sessionLost ? 'signed-out' : online ? 'online' : 'offline'}
      load={load} actions={actions} moveCounts={moveCounts}
      onPrev={() => goto(shiftMonday(monday, -7))}
      onNext={() => goto(shiftMonday(monday, 7))}
      onRetry={() => { setFailure(null); setAttempt((a) => a + 1); }}
      onLogSomething={() => void navigate('/')}
      onReviewDone={async () => {
        const r = await writes.reviewDone(monday); // refreshes the Local copy after the Server confirms
        if (r.ok) await reload();
        return r;
      }}
    />
  );
}
