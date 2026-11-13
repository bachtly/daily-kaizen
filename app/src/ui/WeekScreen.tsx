import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useInRouterContext, useNavigate, useParams } from 'react-router';
import { activityTotals } from '../data/activities';
import { dateOf, dayBounds, loggedMs, shiftDate } from '../data/day';
import type { ActivityRow, CategoryRow, EntryRow } from '../data/db';
import type { Result } from '../data/request';
import { mondayOf, weekBounds, weekTotals } from '../data/week';
import { ActivityTotals, type ActivityActions } from './ActivityTotals';
import { CategoryTotals } from './CategoryTotals';
import { deviceZone, writes } from './liveWrites';
import { useLogNow } from './LogNow';
import { ConnectionBanner, Phone, type Connection } from './Phone';
import { RefreshedAt } from './RefreshedAt';
import { ReviewDoneButton } from './ReviewDoneButton';
import { Skeleton } from './Skeleton';
import { SuggestedCategoryCard } from './SuggestedCategoryCard';
import { useLocalCopy } from './useLocalCopy';
import { shiftMonday, useWeekEntries, type WeekLoad } from './useWeekEntries';
import { countMoves, formatDuration, hhmm, shortDate } from './weekFormat';

/** Phone writes the page can make. Each resolves when the Server answers. */
export type WeekActions = {
  approveCategory: (categoryId: string) => Promise<Result<unknown>>;
  rejectCategory: (categoryId: string) => Promise<Result<unknown>>;
} & Partial<ActivityActions>;

export type WeekViewProps = {
  /** The week shown: its Monday, `YYYY-MM-DD`. */
  monday: string;
  timeZone: string;
  now: number;
  isCurrentWeek: boolean;
  /** Entries that touch this week. */
  entries: readonly EntryRow[];
  categories: readonly CategoryRow[];
  /** All of mine, Active and merged; the Activity panel is hidden while there are none. */
  activities?: readonly ActivityRow[];
  /** `undefined` when unknown (an earlier week outside the Local copy): the badge and button are hidden. */
  reviewDone?: boolean;
  /** ISO time of the last Local copy refresh; null = never. */
  refreshedAt: string | null;
  connection?: Connection;
  load?: WeekLoad;
  onPrev?: () => void;
  onNext?: () => void;
  onRetry?: () => void;
  onReviewDone?: () => Promise<Result<unknown>>;
  actions?: WeekActions;
  /** Entries that approving each Suggested category would move, by category id. */
  moveCounts?: Record<string, number>;
  /** The floating + and its sheet (live: `useLogNow`). */
  fab?: ReactNode;
  sheet?: ReactNode;
};

const Chevron = ({ left }: { left?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={left ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
);

const weekRange = (monday: string, tz: string) => {
  const a = dayBounds(monday, tz).start;
  const b = dayBounds(shiftDate(monday, 6), tz).start;
  const f = (ms: number) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric', month: 'short' }).format(ms);
  return `${f(a)} – ${f(b)}`;
};

/** One row per day with time logged; a tap opens that day (AC-5.1). Days after today are plain text. */
function DayTotals({ monday, entries, timeZone: tz, now }: { monday: string; entries: readonly EntryRow[]; timeZone: string; now: number }) {
  const inRouter = useInRouterContext();
  const today = dateOf(now, tz);
  const rows = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = shiftDate(monday, i);
    const b = dayBounds(d, tz);
    return { date: d, start: b.start, logged: loggedMs(entries, b, now), span: b.end - b.start };
  }), [monday, tz, entries, now]);
  return (
    <section className="panel" aria-labelledby="days-h">
      <h2 id="days-h">Days</h2>
      <ul className="day-rows">
        {rows.map((r) => {
          const label = shortDate(r.start, tz);
          if (r.date > today) return <li key={r.date}><span className="off"><span>{label}</span><span /><span className="val">–</span><span /></span></li>;
          const to = r.date === today ? '/' : `/day/${r.date}`;
          const body = (
            <>
              <span>{label}</span>{' '}
              <span className="bar"><span style={{ width: `${Math.min(r.logged / r.span, 1) * 100}%` }} /></span>{' '}
              <span className="val">{formatDuration(r.logged)}{' '}<span className="sr-only">logged</span></span>
              <span aria-hidden="true">›</span>
            </>
          );
          return <li key={r.date}>{inRouter ? <Link to={to}>{body}</Link> : <a href={to}>{body}</a>}</li>;
        })}
      </ul>
    </section>
  );
}

/** Week page: time per Category and per day, Suggested categories, Review done (UC-4). Entries are edited on the Day view. */
export function WeekView({
  monday, timeZone, now, isCurrentWeek, entries, categories, activities = [], reviewDone, refreshedAt,
  connection = 'online', load = 'ready', onPrev, onNext, onRetry, onReviewDone, actions, moveCounts = {}, fab, sheet,
}: WeekViewProps) {
  const online = connection !== 'offline';
  const bounds = useMemo(() => weekBounds(monday, timeZone), [monday, timeZone]);
  const totals = useMemo(() => weekTotals(entries, bounds, now), [entries, bounds, now]);
  const actTotals = useMemo(() => activityTotals(entries, bounds, now), [entries, bounds, now]);
  const refreshedLabel = refreshedAt ? hhmm(Date.parse(refreshedAt), timeZone) : null;
  const suggested = categories.filter((c) => c.status === 'suggested');

  return (
    <Phone tab="week" busy={load === 'loading'} fab={fab} overlay={sheet}>
      <ConnectionBanner state={connection} refreshedAt={refreshedLabel} />
      <header className="day-head">
        <div>
          <h1>Week</h1>
          <p className="sub">{weekRange(monday, timeZone)}</p>
        </div>
        <div className="wnav" role="group" aria-label="Choose week">
          <button className="icon-btn" aria-label="Previous week" onClick={onPrev}><Chevron left /></button>
          <button className="icon-btn" aria-label="Next week" onClick={onNext} disabled={isCurrentWeek}><Chevron /></button>
        </div>
      </header>
      <div className="week-meta">
        {load === 'loading' ? (
          <>
            <Skeleton height={26} width={96} radius={12} style={{ margin: 0 }} />
            <Skeleton height={18} width={110} style={{ margin: 0 }} />
          </>
        ) : (
          <>
            {reviewDone !== undefined ? (
              <span className={reviewDone ? 'badge done' : 'badge'}>{reviewDone ? 'Review done ✓' : 'Not reviewed'}</span>
            ) : <span />}
            <RefreshedAt time={refreshedLabel} />
          </>
        )}
      </div>

      {load === 'loading' && <>{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} style={{ margin: '10px 0' }} />)}</>}
      {load === 'offline-earlier-week' && (
        <div className="empty">
          Earlier weeks need a connection.
          <div><button className="secondary" style={{ marginTop: 12 }} onClick={onRetry}>Retry</button></div>
        </div>
      )}
      {load === 'session-lost-earlier-week' && <div className="empty">Sign in to see earlier weeks.</div>}

      {load === 'ready' && (
        <>
          {entries.length === 0 && <div className="empty">Nothing logged this week yet.</div>}
          <CategoryTotals totals={totals} categories={categories} hasEntries={entries.length > 0} />
          <ActivityTotals
            totals={actTotals} activities={activities} categories={categories} online={online}
            actions={actions?.renameActivity && actions.mergeActivity ? { renameActivity: actions.renameActivity, mergeActivity: actions.mergeActivity } : undefined}
          />
          <DayTotals monday={monday} entries={entries} timeZone={timeZone} now={now} />

          {actions && suggested.map((c) => (
            <SuggestedCategoryCard
              key={c.id} category={c} moveCount={moveCounts[c.id] ?? 0} online={online}
              onApprove={() => actions.approveCategory(c.id)} onReject={() => actions.rejectCategory(c.id)}
            />
          ))}

          {entries.length > 0 && reviewDone === false && onReviewDone && (
            <ReviewDoneButton onMark={onReviewDone} online={online} />
          )}
        </>
      )}
    </Phone>
  );
}

// ---- live wiring ----

const MONDAY = /^\d{4}-\d\d-\d\d$/;

/** The Week screen wired to the Local copy and the Server. `/week` is the current week, `/week/:monday` another one. */
export function WeekScreen(_props: { isCurrentWeek?: boolean }) {
  const { monday: param } = useParams();
  const navigate = useNavigate();
  const tz = deviceZone();
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(() => navigator.onLine);
  const { copy, ready: copyReady, reload } = useLocalCopy();
  const logNow = useLogNow();

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60_000);
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

  const currentMonday = mondayOf(now, tz);
  const monday = param && MONDAY.test(param) ? param : currentMonday;
  const w = useWeekEntries({ monday, now, tz, copy, copyReady, reload });

  const actions: WeekActions = {
    approveCategory: async (id) => w.afterWrite(await writes.approveCategory(id)),
    rejectCategory: async (id) => w.afterWrite(await writes.rejectCategory(id)),
    renameActivity: async (id, name) => w.afterWrite(await writes.renameActivity(id, name)),
    mergeActivity: async (from, into) => w.afterWrite(await writes.mergeActivity(from, into)),
  };
  const goto = (m: string) => void navigate(m === currentMonday ? '/week' : `/week/${m}`);

  return (
    <WeekView
      monday={monday} timeZone={tz} now={now} isCurrentWeek={monday >= currentMonday}
      entries={w.entries} categories={copy.categories} activities={copy.activities} refreshedAt={copy.refreshedAt}
      reviewDone={w.inLocalCopy && copyReady ? copy.reviews.some((r) => r.week_start === monday) : undefined}
      connection={w.sessionLost ? 'signed-out' : online ? 'online' : 'offline'}
      load={w.load} actions={actions} moveCounts={countMoves(copy.entries)}
      onPrev={() => goto(shiftMonday(monday, -7))}
      onNext={() => goto(shiftMonday(monday, 7))}
      onRetry={w.retry}
      onReviewDone={async () => {
        const r = await writes.reviewDone(monday); // refreshes the Local copy after the Server confirms
        if (r.ok) { await reload(); w.setSessionLost(false); }
        else if (r.error === 'session_lost') w.setSessionLost(true);
        return r;
      }}
      fab={logNow.fab} sheet={logNow.sheet}
    />
  );
}
