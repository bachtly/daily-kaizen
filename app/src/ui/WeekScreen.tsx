import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { CategoryRow, EntryRow } from '../data/db';
import { fetchWeek, readLocalCopy, type LocalCopy } from '../data/localCopy';
import type { Result } from '../data/request';
import { mondayOf, weekBounds, weekTotals, zonedParts } from '../data/week';
import { CategoryTotals } from './CategoryTotals';
import { deviceZone, writes } from './liveWrites';
import { ConnectionBanner, Phone, type Connection } from './Phone';
import { RefreshedAt } from './RefreshedAt';
import { ReviewDoneButton } from './ReviewDoneButton';
import { categoryColour } from './weekFormat';

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
  load?: 'ready' | 'loading' | 'offline-earlier-week';
  onPrev?: () => void;
  onNext?: () => void;
  onRetry?: () => void;
  onLogSomething?: () => void;
  onReviewDone?: () => Promise<Result<unknown>>;
};

const clock = (ms: number, tz: string) => {
  const p = zonedParts(ms, tz);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
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

/** This week page: time per Category, Entries by day, Review done (UC-4). Editing and tagging come in a later PR. */
export function WeekView({
  monday, timeZone, now, isCurrentWeek, entries, categories, reviewDone, refreshedAt,
  connection = 'online', load = 'ready', onPrev, onNext, onRetry, onLogSomething, onReviewDone,
}: WeekViewProps) {
  const bounds = useMemo(() => weekBounds(monday, timeZone), [monday, timeZone]);
  const totals = useMemo(() => weekTotals(entries, bounds, now), [entries, bounds, now]);
  const refreshedLabel = refreshedAt ? clock(Date.parse(refreshedAt), timeZone) : null;
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
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <Phone tab="week">
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

      {load === 'loading' && <>{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" />)}</>}
      {load === 'offline-earlier-week' && (
        <div className="empty">
          Earlier weeks need a connection.
          <div><button className="secondary" style={{ marginTop: 12 }} onClick={onRetry}>Retry</button></div>
        </div>
      )}

      {load === 'ready' && (
        <>
          <CategoryTotals totals={totals} categories={categories} hasEntries={entries.length > 0} />

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
              {day.entries.map((e) => (
                <EntryLine key={e.id} entry={e} category={e.category_id ? catById.get(e.category_id) : undefined} timeZone={timeZone} />
              ))}
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

function EntryLine({ entry, category, timeZone }: { entry: EntryRow; category?: CategoryRow; timeZone: string }) {
  return (
    <div className="entry">
      <div className="what" style={{ cursor: 'default' }}>
        <span className="text">{entry.text}</span>
        <span className="when">{clock(Date.parse(entry.started_at), timeZone)}–{clock(Date.parse(entry.ended_at), timeZone)}</span>
      </div>
      <span
        className={category ? 'tag' : 'tag neutral'}
        style={{ background: category ? categoryColour(category.name) : undefined, display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
      >
        {category?.name ?? 'Untagged'}
      </span>
    </div>
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
  const [fetchState, setFetchState] = useState<'idle' | 'offline' | 'session-lost'>('idle');
  const [attempt, setAttempt] = useState(0);

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
    return () => {
      live = false;
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
      if (r.ok) { setFetched({ monday, entries: r.data }); setFetchState('idle'); }
      else setFetchState(r.error === 'session_lost' ? 'session-lost' : 'offline');
    });
    return () => ctl.abort();
  }, [inLocalCopy, monday, tz, attempt]);

  const bounds = weekBounds(monday, tz);
  const haveEarlier = !inLocalCopy && fetched?.monday === monday;
  const entries = inLocalCopy
    ? copy.entries.filter((e) => Date.parse(e.started_at) < bounds.end && Date.parse(e.ended_at) > bounds.start)
    : haveEarlier ? fetched.entries : [];
  const load: WeekViewProps['load'] =
    inLocalCopy ? (copyReady ? 'ready' : 'loading')
    : haveEarlier ? 'ready'
    : fetchState === 'offline' ? 'offline-earlier-week' : 'loading';
  const goto = (m: string) => void navigate(m === currentMonday ? '/week' : `/week/${m}`);

  return (
    <WeekView
      monday={monday} timeZone={tz} now={now} isCurrentWeek={monday >= currentMonday}
      entries={entries} categories={copy.categories} refreshedAt={copy.refreshedAt}
      reviewDone={inLocalCopy ? copy.reviews.some((r) => r.week_start === monday) : undefined}
      connection={fetchState === 'session-lost' ? 'signed-out' : online ? 'online' : 'offline'}
      load={load}
      onPrev={() => goto(shiftMonday(monday, -7))}
      onNext={() => goto(shiftMonday(monday, 7))}
      onRetry={() => { setFetchState('idle'); setAttempt((a) => a + 1); }}
      onLogSomething={() => void navigate('/')}
      onReviewDone={async () => {
        const r = await writes.reviewDone(monday); // refreshes the Local copy after the Server confirms
        if (r.ok) await reload();
        return r;
      }}
    />
  );
}
