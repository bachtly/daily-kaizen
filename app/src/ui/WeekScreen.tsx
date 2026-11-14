import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useInRouterContext, useNavigate, useParams } from 'react-router';
import { activityTotals, lastWeekNote } from '../data/activities';
import { dateOf, dayBounds, loggedMs, shiftDate } from '../data/day';
import type { ActivityRow, CategoryRow, EntryRow, InsightRow, SettingsRow, SummaryRow, TargetRow } from '../data/db';
import { cardsOf, changeFor, phoneFacts, shiftWeek, trendWeeks } from '../data/insights';
import type { Result } from '../data/request';
import { mondayOf, weekBounds, weekTotals } from '../data/week';
import { ActivityTotals, type ActivityActions } from './ActivityTotals';
import { CategoryTotals } from './CategoryTotals';
import { ChangeCard, InsightsPanel, type InsightActions } from './Insights';
import { deviceZone, writes } from './liveWrites';
import { useLogNow } from './LogNow';
import { ConnectionBanner, Phone, type Connection } from './Phone';
import { RefreshedAt } from './RefreshedAt';
import { ReviewDoneButton } from './ReviewDoneButton';
import { Skeleton } from './Skeleton';
import { SuggestedCategoryCard } from './SuggestedCategoryCard';
import { useLocalCopy } from './useLocalCopy';
import { TrendPanel, WeekHeatmap } from './WeekCharts';
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
  /** Weekly targets per Activity (and optionally Category). */
  targets?: readonly TargetRow[];
  /** The note saved with last week's review ("one change for next week"); shown at the top. */
  lastNote?: string | null;
  /** `undefined` when unknown (an earlier week outside the Local copy): the badge and button are hidden. */
  reviewDone?: boolean;
  /** ISO time of the last Local copy refresh; null = never. */
  refreshedAt: string | null;
  connection?: Connection;
  load?: WeekLoad;
  onPrev?: () => void;
  onNext?: () => void;
  onRetry?: () => void;
  onReviewDone?: (note: string) => Promise<Result<unknown>>;
  actions?: WeekActions;
  /** Entries that approving each Suggested category would move, by category id. */
  moveCounts?: Record<string, number>;
  /** Insight cards (#80) from the Local copy; `undefined` for a week outside it (no Insights panel). */
  insights?: readonly InsightRow[];
  /** Weekly summaries for the trend (current week only). */
  summaries?: readonly SummaryRow[];
  /** Quiet hours, for logged days. */
  settings?: Pick<SettingsRow, 'quiet_start' | 'quiet_end'> | null;
  insightActions?: InsightActions;
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
  monday, timeZone, now, isCurrentWeek, entries, categories, activities = [], targets = [], lastNote = null, reviewDone, refreshedAt,
  connection = 'online', load = 'ready', onPrev, onNext, onRetry, onReviewDone, actions, moveCounts = {}, fab, sheet,
  insights, summaries = [], settings = null, insightActions,
}: WeekViewProps) {
  const online = connection !== 'offline';
  const bounds = useMemo(() => weekBounds(monday, timeZone), [monday, timeZone]);
  const totals = useMemo(() => weekTotals(entries, bounds, now), [entries, bounds, now]);
  const actTotals = useMemo(() => activityTotals(entries, bounds, now, targets), [entries, bounds, now, targets]);
  const refreshedLabel = refreshedAt ? hhmm(Date.parse(refreshedAt), timeZone) : null;
  const suggested = categories.filter((c) => c.status === 'suggested');
  const facts = useMemo(() => phoneFacts(entries, monday, timeZone, now, categories, settings), [entries, monday, timeZone, now, categories, settings]);
  const cards = insights ? cardsOf(insights, monday) : [];
  const change = insights ? changeFor(insights, monday) : null;
  const running = change !== null && change.active_until !== null && change.active_until >= monday;
  const stale = cards.length > 0 && entries.some((e) => e.created_at > cards[0].generated_at);
  const acceptedHere = cards.find((c) => c.status === 'accepted');

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

      {load === 'ready' && change && (
        <ChangeCard change={change} running={running} canKeep={isCurrentWeek && change.active_until === monday} online={online}
          onKeep={insightActions ? () => insightActions.keep(change.id) : undefined} />
      )}
      {load === 'ready' && !change && lastNote && (
        <p className="last-note"><span className="field-hint">Your change for this week</span>{lastNote}</p>
      )}

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
          {insights && (
            <InsightsPanel cards={cards} loggedDays={facts.loggedDays} entries={entries} tz={timeZone} online={online}
              canRequest stale={stale} actions={insightActions} />
          )}
          {entries.length > 0 && <WeekHeatmap facts={facts} categories={categories} activities={activities} />}
          {isCurrentWeek && summaries.length > 0 && (
            <TrendPanel weeks={trendWeeks(summaries, facts)} categories={categories}
              changeWeek={change ? shiftWeek(change.week_start, 1) : null} />
          )}
          <CategoryTotals totals={totals} categories={categories} hasEntries={entries.length > 0} />
          <ActivityTotals
            totals={actTotals} activities={activities} categories={categories} online={online}
            actions={actions?.renameActivity && actions.mergeActivity
              ? { renameActivity: actions.renameActivity, mergeActivity: actions.mergeActivity, setTarget: actions.setTarget }
              : undefined}
          />
          <DayTotals monday={monday} entries={entries} timeZone={timeZone} now={now} />

          {actions && suggested.map((c) => (
            <SuggestedCategoryCard
              key={c.id} category={c} moveCount={moveCounts[c.id] ?? 0} online={online}
              onApprove={() => actions.approveCategory(c.id)} onReject={() => actions.rejectCategory(c.id)}
            />
          ))}

          {entries.length > 0 && reviewDone === false && onReviewDone && (
            <ReviewDoneButton key={acceptedHere?.id ?? 'none'} onMark={onReviewDone} online={online} initialNote={acceptedHere?.try_this} />
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
    setTarget: async (activityId, categoryId, minutes) => w.afterWrite(await writes.setActivityTarget(activityId, categoryId, minutes)),
  };
  const insightActions: InsightActions = {
    accept: async (id) => w.afterWrite(await writes.acceptInsight(id)),
    dismiss: async (id, reason) => w.afterWrite(await writes.dismissInsight(id, reason)),
    undo: async (id) => w.afterWrite(await writes.undoInsight(id)),
    keep: async (id) => w.afterWrite(await writes.keepChange(id)),
    request: async () => w.afterWrite(await writes.requestInsights(monday)),
  };
  const goto = (m: string) => void navigate(m === currentMonday ? '/week' : `/week/${m}`);

  return (
    <WeekView
      monday={monday} timeZone={tz} now={now} isCurrentWeek={monday >= currentMonday}
      entries={w.entries} categories={copy.categories} activities={copy.activities} targets={copy.targets} lastNote={lastWeekNote(copy.reviews, monday)} refreshedAt={copy.refreshedAt}
      reviewDone={w.inLocalCopy && copyReady ? copy.reviews.some((r) => r.week_start === monday) : undefined}
      connection={w.sessionLost ? 'signed-out' : online ? 'online' : 'offline'}
      load={w.load} actions={actions} moveCounts={countMoves(copy.entries)}
      insights={w.inLocalCopy && copyReady ? copy.insights ?? [] : undefined} summaries={copy.summaries} settings={copy.settings}
      insightActions={insightActions}
      onPrev={() => goto(shiftMonday(monday, -7))}
      onNext={() => goto(shiftMonday(monday, 7))}
      onRetry={w.retry}
      onReviewDone={async (note) => {
        const r = await writes.reviewDone(monday, note); // refreshes the Local copy after the Server confirms
        if (r.ok) { await reload(); w.setSessionLost(false); }
        else if (r.error === 'session_lost') w.setSessionLost(true);
        return r;
      }}
      fab={logNow.fab} sheet={logNow.sheet}
    />
  );
}
