import { useState, type CSSProperties, type ReactNode } from 'react';
import { ConnectionBanner, type Connection } from '../../ui/ConnectionBanner';
import { LogFab } from '../../ui/LogFab';
import { categoryColour } from '../../ui/weekFormat';
import {
  allDays, loggedToday, NOW, planDays as defaultPlanDays, TODAY_LABEL, weekDates,
  type LoggedEntry, type PlanBlock, type Weekday,
} from './plan.mocks';
import './plan-mockups.css';

// Presentational mockups for #128. Mock data only; nothing here is wired to the app.

type TabId = 'day' | 'plan' | 'week' | 'settings';

const tabIcons: Record<TabId, ReactNode> = {
  day: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  plan: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></>,
  week: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>,
};
const tabLabels: Record<TabId, string> = { day: 'Day', plan: 'Plan', week: 'Week', settings: 'Settings' };

/** The app's phone frame with a configurable tab bar (3 tabs today, 4 with a Plan tab). */
export function MockPhone({ children, tabs = ['day', 'week', 'settings'], current, overlay, fab = true }: {
  children: ReactNode; tabs?: TabId[]; current?: TabId; overlay?: ReactNode; fab?: boolean;
}) {
  return (
    <div className="phone" style={{ position: 'relative' }}>
      <div className="phone-status" />
      <main className={fab ? 'phone-body with-fab' : 'phone-body'} tabIndex={0}>{children}</main>
      {fab && !overlay && <div className="fab-dock"><LogFab onOpen={() => {}} /></div>}
      {current && (
        <nav className="tabbar" aria-label="Main">
          {tabs.map((t) => (
            <a key={t} className="tab" href="#" aria-current={t === current ? 'page' : undefined} onClick={(e) => e.preventDefault()}>
              <svg className="tab-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{tabIcons[t]}</svg>
              <span>{tabLabels[t]}</span>
            </a>
          ))}
        </nav>
      )}
      <div className="phone-home" />
      {overlay}
    </div>
  );
}

const Bell = () => (
  <svg className="bell" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />
  </svg>
);

const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const untilLabel = (start: string, now: string) => `in ${mins(start) - mins(now)} min`;

type BlockState = 'done' | 'missed' | 'next' | 'later';
/** Past blocks: done if an Entry covers most of them, missed otherwise. The first future block is next. */
function stateOf(b: PlanBlock, blocks: readonly PlanBlock[], logged: readonly LoggedEntry[], now: string): BlockState {
  if (mins(b.end) <= mins(now) || mins(b.start) < mins(now)) {
    const covered = logged.reduce((s, e) => s + Math.max(0, Math.min(mins(e.end), mins(b.end)) - Math.max(mins(e.start), mins(b.start))), 0);
    return covered * 2 >= mins(b.end) - mins(b.start) ? 'done' : 'missed';
  }
  const next = blocks.find((x) => mins(x.start) >= mins(now));
  return next?.id === b.id ? 'next' : 'later';
}

function PlanRow({ block, state, now, logAsPlanned }: { block: PlanBlock; state: BlockState; now: string; logAsPlanned?: boolean }) {
  const cls = state === 'missed' ? 'plan-row missed' : state === 'done' ? 'plan-row done' : state === 'next' ? 'plan-row next' : 'plan-row';
  return (
    <div className={cls}>
      <button className="what" aria-label={`Edit planned ${block.text}, ${block.start}–${block.end}`}>
        <span className="kind">Planned{block.repeats === 'date' ? ' · only today' : ''}</span>
        <span className="text">{block.text}</span>
        <span className="when">{block.start}–{block.end}</span>
        {state === 'next' && <span className="plan-badge">Next · {untilLabel(block.start, now)}</span>}
        {state === 'missed' && <span className="plan-badge quiet">Not logged</span>}
      </button>
      {state === 'missed' && logAsPlanned
        ? <button className="link" aria-label={`Log ${block.text} ${block.start}–${block.end} as planned`}>Log as planned</button>
        : state !== 'done' && <Bell />}
    </div>
  );
}

function EntryLine({ e }: { e: LoggedEntry }) {
  return (
    <div className="entry">
      <button className="what" aria-label={`Edit ${e.text}, ${e.start}–${e.end}`}>
        <span className="text">{e.text}</span> <span className="when">{e.start}–{e.end}</span>
      </button>
      <button className="tag" style={{ background: categoryColour(e.category) }} aria-label={`Category: ${e.category}. Change`}>{e.category} ▾</button>
    </div>
  );
}

function WeekStrip({ current, days = allDays, futureOpen }: { current: Weekday; days?: Weekday[]; futureOpen?: boolean }) {
  return (
    <nav className="strip" aria-label="Days of the week" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
      {days.map((d) => (
        <button key={d} aria-current={d === current ? 'date' : undefined} className={d === 'Mon' ? 'today' : undefined} disabled={!futureOpen && d !== 'Mon'}>
          <span>{d}</span> <b>{weekDates[d]}</b>
          <span className="fill"><span style={{ width: d === 'Mon' ? '20%' : '0%' }} /></span>
        </button>
      ))}
    </nav>
  );
}

/**
 * Q1 Option A: the plan lives in the Day view. Past hours show what was logged, and a missed block offers
 * Log as planned; from now on the day shows what is planned. Future days in the strip open to plan.
 */
export function DayWithPlan({ blocks, logged = loggedToday, now = NOW, connection = 'online', empty }: {
  blocks: PlanBlock[]; logged?: LoggedEntry[]; now?: string; connection?: Connection; empty?: boolean;
}) {
  type Item = { at: number; node: ReactNode };
  const items: Item[] = [
    ...logged.map((e) => ({ at: mins(e.start), node: <EntryLine key={e.id} e={e} /> })),
    ...blocks.flatMap((b) => {
      const s = stateOf(b, blocks, logged, now);
      return s === 'done' ? [] : [{ at: mins(b.start), node: <PlanRow key={b.id} block={b} state={s} now={now} logAsPlanned={connection === 'online'} /> }];
    }),
    { at: mins(now) + 0.5, node: <div key="now" className="now-line" role="separator" aria-label={`Now ${now}`}>Now {now}</div> },
  ].sort((a, b) => a.at - b.at);
  return (
    <MockPhone current="day">
      <ConnectionBanner state={connection} refreshedAt="10:20" />
      <header className="day-head">
        <div>
          <h1>Today</h1>
          <p className="sub">{TODAY_LABEL} · week of Nov 30–Dec 6</p>
        </div>
        <div className="plan-head-actions"><button className="pill-btn">Week plan</button></div>
      </header>
      <WeekStrip current="Mon" futureOpen />
      <div className="day-sum"><span>Logged 1h 20m · Planned {empty ? '0m' : '8h 15m'}</span></div>
      <section className="day-list" aria-label="Today: logged and planned">
        {empty ? (
          <>
            {logged.map((e) => <EntryLine key={e.id} e={e} />)}
            <div className="empty">
              No plan for Monday yet.
              <div className="row-actions" style={{ justifyContent: 'center' }}>
                <button className="secondary">Add a block</button>
                <button className="secondary">Copy from another day</button>
              </div>
            </div>
          </>
        ) : items.map((i) => i.node)}
      </section>
      {!empty && <button className="link add-row" disabled={connection !== 'online'}>+ Add to today's plan</button>}
    </MockPhone>
  );
}

/** Today's plan as an agenda list (Q2 Option A) or an hour grid (Q2 Option B). */
function PlanBody({ blocks, layout, now }: { blocks: PlanBlock[]; layout: 'list' | 'grid'; now: string }) {
  if (layout === 'list') {
    return (
      <section aria-label="Plan for Monday">
        {blocks.map((b) => {
          const s = stateOf(b, blocks, loggedToday, now);
          return <PlanRow key={b.id} block={b} state={s === 'missed' ? 'later' : s} now={now} />;
        })}
      </section>
    );
  }
  // 112 px an hour, so a 15-minute block is still a 26 px tap target (axe target-size).
  const from = 7 * 60, to = 18 * 60, px = 112 / 60;
  return (
    <section className="grid" aria-label="Plan for Monday" style={{ height: (to - from) * px + 12 }}>
      {Array.from({ length: (to - from) / 60 + 1 }, (_, i) => (
        <div key={i} className="hour" style={{ top: i * 60 * px + 8 }} aria-hidden="true"><span>{String(7 + i).padStart(2, '0')}:00</span></div>
      ))}
      {blocks.map((b) => {
        const s = stateOf(b, blocks, loggedToday, now);
        const h = Math.max((mins(b.end) - mins(b.start)) * px - 2, 26);
        return (
          <button
            key={b.id} className={`block${s === 'done' || s === 'missed' ? ' past' : ''}${s === 'next' ? ' next' : ''}`}
            style={{ top: (mins(b.start) - from) * px + 9, height: h }}
            aria-label={`Edit planned ${b.text}, ${b.start}–${b.end}`}
          >
            <span className="text">{b.text}{s === 'next' ? ` · ${untilLabel(b.start, now)}` : ''}</span>
            {h > 40 && <span className="when">{b.start}–{b.end}</span>}
          </button>
        );
      })}
      <div className="now" style={{ top: (mins(now) - from) * px + 8 }} role="separator" aria-label={`Now ${now}`} />
    </section>
  );
}

/** Q1 Option B: a fourth tab for the plan; the Day view stays log-only. */
export function PlanTab({ blocks, layout = 'list', now = NOW }: { blocks: PlanBlock[]; layout?: 'list' | 'grid'; now?: string }) {
  return (
    <MockPhone tabs={['day', 'plan', 'week', 'settings']} current="plan">
      <header className="day-head">
        <div>
          <h1>Plan</h1>
          <p className="sub">Today, {TODAY_LABEL} · 8 blocks</p>
        </div>
        <div className="plan-head-actions"><button className="pill-btn">Week plan</button></div>
      </header>
      <WeekStrip current="Mon" days={defaultPlanDays} futureOpen />
      <PlanBody blocks={blocks} layout={layout} now={now} />
      <button className="link add-row">+ Add block</button>
    </MockPhone>
  );
}

/** The repeating plan per weekday: Plan days as tabs, Copy to other days. */
export function WeekPlan({ day, blocks, days = defaultPlanDays, overlay }: {
  day: Weekday; blocks: PlanBlock[]; days?: Weekday[]; overlay?: ReactNode;
}) {
  const weekly = blocks.filter((b) => b.repeats === 'weekly');
  return (
    <MockPhone current="day" overlay={overlay} fab={false}>
      <a className="install-back link" href="#" onClick={(e) => e.preventDefault()}>‹ Today</a>
      <h1 style={{ marginBottom: 0 }}>Week plan</h1>
      <p className="sub" style={{ fontSize: 14, color: 'var(--muted)', margin: '4px 0 0' }}>Repeats every week. Change one date from its day.</p>
      <div className="day-tabs" role="tablist" aria-label="Plan days" style={{ '--n': days.length } as CSSProperties}>
        {days.map((d) => <button key={d} role="tab" aria-selected={d === day}>{d}</button>)}
      </div>
      <section role="tabpanel" aria-label={`Every ${day}`}>
        {weekly.length === 0 ? (
          <div className="empty">
            Nothing planned for {day}.
            <div className="row-actions" style={{ justifyContent: 'center' }}>
              <button className="secondary">Add a block</button>
              <button className="secondary">Copy Monday here</button>
            </div>
          </div>
        ) : weekly.map((b) => (
          <div key={b.id} className="plan-row">
            <button className="what" aria-label={`Edit ${b.text}, every ${day} ${b.start}–${b.end}`}>
              <span className="text">{b.text}</span>
              <span className="when">{b.start}–{b.end}</span>
            </button>
            <Bell />
          </div>
        ))}
      </section>
      {weekly.length > 0 && (
        <div className="row-actions">
          <button className="secondary">+ Add block</button>
          <button className="secondary">Copy {day} to…</button>
        </div>
      )}
    </MockPhone>
  );
}

/** Sheet: pick the days to copy a weekday's plan to. */
export function CopySheet({ from }: { from: Weekday }) {
  const [picked, setPicked] = useState<Weekday[]>(['Tue', 'Wed', 'Thu']);
  const toggle = (d: Weekday) => setPicked((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));
  return (
    <div className="sheet-backdrop">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="copy-title">
        <h2 id="copy-title" className="sheet-title">Copy {from} to…</h2>
        <p className="sheet-sub">Replaces the plan on the days you pick.</p>
        <div className="day-toggles" role="group" aria-label="Days to copy to" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          {defaultPlanDays.filter((d) => d !== from).map((d) => (
            <button key={d} aria-pressed={picked.includes(d)} onClick={() => toggle(d)}>{d}</button>
          ))}
        </div>
        <button className="primary">Copy to {picked.length} {picked.length === 1 ? 'day' : 'days'}</button>
        <div className="row-actions" style={{ justifyContent: 'center' }}><button className="link">Cancel</button></div>
      </div>
    </div>
  );
}

/** Sheet: add or edit a block. A weekly block asks whether the change is for this date only or every week. */
export function BlockSheet({ block, scope = 'every', error }: { block?: PlanBlock; scope?: 'day' | 'every'; error?: 'text' | 'end' }) {
  const [s, setS] = useState(scope);
  const editing = Boolean(block);
  return (
    <div className="sheet-backdrop">
      <div className="sheet log-sheet" role="dialog" aria-modal="true" aria-labelledby="block-title">
        <div className="sheet-head">
          <h2 id="block-title" className="sheet-title">{editing ? 'Edit block' : 'New block'}</h2>
          <button className="link">Cancel</button>
        </div>
        <label className="field-label" htmlFor="block-text">What</label>
        <input
          id="block-text" className="text-input" defaultValue={error === 'text' ? '' : block?.text ?? ''} placeholder="Deep work: design doc"
          aria-invalid={error === 'text' || undefined} aria-describedby={error === 'text' ? 'block-text-err' : undefined}
        />
        {error === 'text' && <p id="block-text-err" className="error">Say what you plan to do.</p>}
        <div className="times">
          <label className="time"><span className="field-label">Start</span>
            <input className="value text-input" type="time" defaultValue={block?.start ?? '13:30'} />
          </label>
          <label className="time"><span className="field-label">End</span>
            <input className="value text-input" type="time" defaultValue={error === 'end' ? '13:00' : block?.end ?? '15:00'}
              aria-invalid={error === 'end' || undefined} aria-describedby={error === 'end' ? 'block-end-err' : undefined} />
          </label>
        </div>
        {error === 'end' && <p id="block-end-err" className="error">End must be after the start.</p>}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field-label">{editing ? 'Change' : 'Repeats'}</legend>
          <div className="choice">
            <label><input type="radio" name="scope" checked={s === 'day'} onChange={() => setS('day')} /> Only {TODAY_LABEL}</label>
            <label><input type="radio" name="scope" checked={s === 'every'} onChange={() => setS('every')} /> Every Monday</label>
          </div>
        </fieldset>
        <p className="note">Heads-up 10 min before. Change it in Settings.</p>
        <button className="primary">Save</button>
        {editing && <div className="row-actions" style={{ justifyContent: 'center' }}><button className="link delete-link">Delete block</button></div>}
      </div>
    </div>
  );
}

/** Settings: the new Plan panel (Plan days and Heads-up). */
export function SettingsPlan({ days = defaultPlanDays, lead = 10 }: { days?: Weekday[]; lead?: 0 | 5 | 10 | 15 | 30 }) {
  const [on, setOn] = useState<Weekday[]>(days);
  const [n, setN] = useState(lead);
  return (
    <MockPhone current="settings">
      <h1>Settings</h1>
      <section className="panel" aria-labelledby="plan-h">
        <h2 id="plan-h">Plan</h2>
        <p className="label" id="days-l">Plan days</p>
        <div className="day-toggles" role="group" aria-labelledby="days-l">
          {allDays.map((d) => (
            <button key={d} aria-pressed={on.includes(d)} onClick={() => setOn((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]))}>{d}</button>
          ))}
        </div>
        <p className="label" id="lead-l">Heads-up before each block</p>
        <div className="segmented" role="radiogroup" aria-labelledby="lead-l">
          {([0, 5, 10, 15, 30] as const).map((v) => (
            <button key={v} role="radio" aria-checked={n === v} onClick={() => setN(v)}>{v === 0 ? 'Off' : `${v}m`}</button>
          ))}
        </div>
        <p className="hint">{n === 0 ? 'No heads-up pushes.' : `A push ${n} minutes before each planned block, even in Quiet hours.`}</p>
      </section>
      <section className="panel" aria-labelledby="notif-h">
        <h2 id="notif-h">Notifications</h2>
        <p className="hint" style={{ marginTop: 0 }}>Quiet hours, Nudge gap and push as today.</p>
      </section>
    </MockPhone>
  );
}

/** The heads-up push on the lock screen. Tapping it opens today's Day view. */
export function HeadsUpPush({ title = 'Standup in 10 min', body = '10:45–11:00 · then Code review' }: { title?: string; body?: string }) {
  return (
    <MockPhone fab={false}>
      <div className="lock">
        <p className="clock">10:35</p>
        <p className="date">Monday 30 November</p>
        <button className="push" aria-label={`Notification from daily-kaizen: ${title}. ${body}. Opens today`}>
          <span className="icon" aria-hidden="true">K</span>
          <span className="title">{title}</span>
          <span className="ago">now</span>
          <span className="body">{body}</span>
        </button>
      </div>
    </MockPhone>
  );
}
