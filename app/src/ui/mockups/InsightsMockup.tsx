import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Phone } from '../Phone';
import { categoryColour } from '../weekFormat';

/**
 * Mockup for #80 (deep analysis). Not wired to the app: static week, static insights.
 * It shows where insights sit on the Week page and how each one carries its evidence.
 * Sources for email, progress and detachment were not in the research run; check them before use.
 */

type Cat = 'Deep' | 'Shallow' | 'Maintenance' | 'Recovery' | 'Waste';
type Evidence = {
  label: string; // short line on the chip
  source: string;
  shows: string;
  limits: string;
  against?: string; // shown when the evidence is mixed
  url: string;
};
export type Insight = {
  id: string;
  finding: string;
  detail: string;
  tryThis: string;
  entries: number;
  evidence: Evidence;
};

const FIRST = 3; // insights shown before "See more"

/** Every insight found this week, ranked by hours it could save. */
const INSIGHTS: Insight[] = [
  {
    id: 'late-waste',
    finding: 'Waste clusters after 21:00',
    detail: '6h of your 9h Waste this week started after 21:00, mostly Game A.',
    tryThis: 'If it’s 21:00, then I put the phone on the charger outside the room.',
    entries: 7,
    evidence: {
      label: 'If-then plans · 21 studies',
      source: 'Wang et al. 2021, meta-analysis of mental contrasting with implementation intentions',
      shows: 'If-then plans raised goal attainment with a small-to-medium effect (g = 0.34, 15,907 people).',
      limits: 'Publication bias was found, so the real effect may be smaller. Written plans worked less well than coached ones.',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8149892/',
    },
  },
  {
    id: 'switching',
    finding: 'Wednesday morning had 9 switches in 2 hours',
    detail: 'Deep work was split into blocks under 20 min by Email and Standup.',
    tryThis: 'If I leave a Deep task, then I note where I stopped and the next step.',
    entries: 9,
    evidence: {
      label: 'Attention residue · 4 studies',
      source: 'Leroy & Glomb 2018, Organization Science',
      shows: 'A short “ready-to-resume” note cut the attention left on the old task, and the next task did not suffer.',
      limits: 'Lab and field studies with office tasks; it does not measure total output over a day.',
      url: 'https://econpapers.repec.org/RePEc:inm:ororsc:v:29:y:2018:i:3:p:380-397',
    },
  },
  {
    id: 'focus-length',
    finding: 'Your Deep blocks of 60–90 min were least often followed by Waste',
    detail: 'Over 4 weeks, 1 of 7 such blocks was followed by Waste; after blocks over 2h, 3 of 4 were.',
    tryThis: 'If I start Deep work, then I plan about 75 min and choose my own break.',
    entries: 10,
    evidence: {
      label: 'Break timing · 1 study, mixed',
      source: 'Smits, Wenzel & de Bruin 2025, Behavioral Sciences',
      shows: 'Self-chosen breaks: fatigue rose more slowly than with fixed Pomodoro timers, with the same productivity.',
      against: 'Popular rules (90-min cycles, 52:17) say a fixed length works for everyone, but they come from blogs without studies behind them.',
      limits: 'One study, 94 students, one 2-hour session.',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12292963/',
    },
  },
  {
    id: 'email',
    finding: 'Email came in 14 short entries across the week',
    detail: 'About 9 min each, on all 5 workdays; 3 of them inside Deep blocks.',
    tryThis: 'If it’s 11:00 or 16:00, then I check email, and not in between.',
    entries: 14,
    evidence: {
      label: 'Email batching · 1 experiment',
      source: 'Kushlev & Dunn 2015, Computers in Human Behavior',
      shows: 'People who checked email 3 times a day felt less daily stress than when they checked freely.',
      limits: 'It measured stress, not output. 124 people, one week per condition.',
      url: 'https://doi.org/10.1016/j.chb.2014.11.005',
    },
  },
  {
    id: 'progress',
    finding: 'Company A · Deep was 6h of your 10h target',
    detail: 'Mon and Fri had no Company A Deep time; the other days had 1–2h.',
    tryThis: 'If it’s Sunday evening, then I put next week’s Deep blocks in my calendar.',
    entries: 6,
    evidence: {
      label: 'Progress monitoring · 138 studies',
      source: 'Harkin et al. 2016, Psychological Bulletin',
      shows: 'Checking progress toward a goal helped people reach it (d = 0.40), more so when progress was written down.',
      limits: 'Most studies were about health goals, not time use.',
      url: 'https://doi.org/10.1037/bul0000025',
    },
  },
  {
    id: 'detach',
    finding: 'Work ran into the 2h before Quiet hours on 2 days',
    detail: 'On Tue and Thu, Deep or Shallow went past 21:00; Quiet hours start at 23:00.',
    tryThis: 'If I stop work, then I write tomorrow’s first step and close the laptop.',
    entries: 4,
    evidence: {
      label: 'Switching off · meta-analysis',
      source: 'Wendsche & Lohmann-Haislah 2017, Frontiers in Psychology',
      shows: 'People who switched off from work after hours had better wellbeing and less exhaustion.',
      limits: 'Mostly surveys at one point in time, so it shows a link, not a cause.',
      url: 'https://doi.org/10.3389/fpsyg.2016.02072',
    },
  },
];

// ---- Week heatmap data: hour 6..23, Mon..Sun ----
const ALL_HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const workday: (Cat | null)[] = [
  null, 'Maintenance', null, 'Deep', 'Deep', 'Shallow', 'Maintenance', 'Recovery', 'Deep', 'Deep', 'Shallow',
  'Maintenance', 'Recovery', 'Recovery', 'Recovery', 'Waste', 'Waste', null,
];
const weekend: (Cat | null)[] = [
  null, null, null, 'Recovery', 'Maintenance', 'Maintenance', 'Recovery', 'Recovery', 'Waste', 'Recovery', 'Recovery',
  'Maintenance', 'Recovery', 'Waste', 'Waste', 'Waste', 'Waste', null,
];
const GRID: (Cat | null)[][] = DAYS.map((d, i) => {
  const row = [...(i < 5 ? workday : weekend)];
  if (d === 'Wed') { row[3] = 'Shallow'; row[4] = 'Deep'; } // the switching morning
  if (d === 'Thu') { row[16] = 'Recovery'; }
  if (d === 'Sat') { row[17] = 'Waste'; } // a late night: the rows grow to fit
  return row;
});
// Only the hours that have Entries get a row.
const used = ALL_HOURS.map((_, hi) => GRID.some((r) => r[hi]));
const HI_FROM = used.indexOf(true);
const HI_TO = used.lastIndexOf(true);
const HOUR_IDX = ALL_HOURS.map((_, i) => i).slice(HI_FROM, HI_TO + 1);

const SWITCHY = new Set(['Wed-9', 'Wed-10']);
const CATS: Cat[] = ['Deep', 'Shallow', 'Maintenance', 'Recovery', 'Waste'];

/** Activity and minutes of one hour cell (static mock data). */
function cellActivity(d: string, h: number, c: Cat): { name: string; min: number } {
  const weekendDay = d === 'Sat' || d === 'Sun';
  const name = {
    Deep: 'Coding',
    Shallow: d === 'Wed' && h === 9 ? 'Standup' : 'Email',
    Maintenance: 'Chores',
    Recovery: 'Walk',
    Waste: weekendDay && h < 20 ? 'Video' : 'Game A',
  }[c];
  return { name, min: (DAYS.indexOf(d) + h) % 3 === 0 ? 25 : 50 };
}
const ACT_CAT: Record<string, Cat> = { 'Game A': 'Waste', Video: 'Waste', Email: 'Shallow', Coding: 'Deep', Standup: 'Shallow', Chores: 'Maintenance', Walk: 'Recovery' };
const ACTIVITIES = Object.keys(ACT_CAT);

// ---- 8-week trend, hours per category (last point is the week shown) ----
const TREND: Record<Cat, number[]> = {
  Deep: [8, 10, 9, 11, 7, 9, 6, 9],
  Shallow: [9, 8, 10, 9, 11, 10, 9, 8],
  Maintenance: [6, 5, 7, 6, 6, 7, 6, 6],
  Recovery: [12, 11, 13, 10, 12, 11, 10, 12],
  Waste: [7, 8, 6, 9, 8, 10, 9, 4],
};

const css = `
.ins-sub { color: var(--muted); font-size: 14px; margin: 0 0 4px; }
.heat { display: grid; grid-template-columns: 26px repeat(7, minmax(0, 1fr)); gap: 2px; font-size: 11px; color: var(--muted); }
.heat .dl { text-align: center; font-size: 12px; }
.heat .hl { font-variant-numeric: tabular-nums; line-height: 14px; }
.heat .cell { height: 14px; border-radius: 3px; background: var(--line); cursor: pointer; }
.heat .cell.sw { outline: 2px solid var(--text); outline-offset: -2px; }
.heat .cell.sel { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent); }
.readout { min-height: 20px; font-size: 14px; margin: 8px 0 0; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 8px; font-size: 13px; color: var(--muted); }
.legend span { display: inline-flex; align-items: center; gap: 5px; }
.legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.chips.by { margin: 4px 0 10px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
.chips.by .chip { flex: none; }
.chip[aria-pressed="true"] { background: var(--text); color: var(--bg); border-color: var(--text); }
.ins { background: var(--bg); border-radius: 14px; padding: 14px; margin-top: 10px; }
.ins .f { font-weight: 600; margin: 0; }
.ins .d { color: var(--muted); font-size: 14px; margin: 4px 0 8px; }
.ins .try { font-size: 15px; margin: 0 0 8px; }
.ins .try b { font-weight: 600; }
.ev { width: 100%; min-height: 44px; display: flex; align-items: center; justify-content: space-between; gap: 8px;
  border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--text);
  font: inherit; font-size: 14px; padding: 0 12px; cursor: pointer; text-align: left; }
.ev small { color: var(--muted); font-size: 13px; }
.evd { font-size: 14px; border-left: 3px solid var(--line); padding: 2px 0 2px 10px; margin: 8px 0; display: grid; gap: 6px; }
.evd p { margin: 0; }
.evd .k { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; display: block; }
.evd a { color: var(--accent); }
.ins .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.ins .row .primary.small { min-height: 44px; font-size: 15px; }
.ins .row2 { display: flex; gap: 16px; flex-wrap: wrap; }
.more { width: 100%; margin-top: 10px; }
.hid { border: 1px dashed var(--line); border-radius: 14px; padding: 10px 12px; margin-top: 10px; font-size: 14px; display: grid; gap: 6px; }
.hid .top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.hid form { display: flex; gap: 8px; }
.hid input { flex: 1; min-width: 0; min-height: 44px; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); color: var(--text); font: inherit; font-size: 15px; padding: 0 10px; }
.hid .saved { color: var(--muted); margin: 0; }
.changed { color: var(--done-text); font-weight: 600; font-size: 15px; }
.lastweek { border: 1px solid var(--accent); border-radius: 14px; padding: 12px 14px; margin-top: 12px; }
.lastweek p { margin: 0; }
.lastweek .res { margin-top: 6px; font-size: 14px; color: var(--done-text); font-weight: 600; }
.trend { display: grid; grid-template-columns: 104px minmax(0, 1fr) 34px; align-items: center; gap: 4px 8px; font-size: 14px; }
.trend .n { display: inline-flex; align-items: center; gap: 6px; }
.trend .n i { flex: none; width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.trend .v { text-align: right; font-variant-numeric: tabular-nums; }
.trend svg { width: 100%; height: 34px; display: block; overflow: visible; }
.axis { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin: 4px 42px 0 112px; }
.asis { color: var(--muted); font-size: 14px; text-align: center; padding: 16px 0 8px; }
`;

function Heatmap() {
  const [by, setBy] = useState<string>('Category');
  const [sel, setSel] = useState<string | null>('Wed-9');
  const pick = (ev: MouseEvent) => {
    const k = (ev.target as HTMLElement).dataset.cell;
    if (k) setSel(k);
  };
  let readout = 'Tap an hour to see what was in it.';
  if (sel) {
    const [d, h] = sel.split('-');
    const c = GRID[DAYS.indexOf(d)][ALL_HOURS.indexOf(+h)];
    readout = c ? `${d} ${h.padStart(2, '0')}:00 · ${c} · ${cellActivity(d, +h, c).name} ${cellActivity(d, +h, c).min} min` : `${d} ${h.padStart(2, '0')}:00 · nothing logged`;
    if (SWITCHY.has(sel)) readout += ' · 5 switches';
  }
  const label = by === 'Category'
    ? 'Hours of the week by Category. Waste is mostly after 21:00; Wednesday 9 to 11 has many switches.'
    : `Hours of the week with ${by}, darker means more minutes.`;
  return (
    <section className="panel" aria-labelledby="heat-h">
      <h2 id="heat-h">When</h2>
      <div className="chips by" role="group" aria-label="Show">
        {['Category', ...ACTIVITIES].map((a) => (
          <button key={a} className="chip" aria-pressed={by === a} onClick={() => setBy(a)}>{a}</button>
        ))}
      </div>
      <div className="heat" role="img" aria-label={label} onClick={pick}>
        <span />
        {DAYS.map((d) => <span key={d} className="dl">{d}</span>)}
        {HOUR_IDX.map((hi) => {
          const h = ALL_HOURS[hi];
          return (
            <div key={h} style={{ display: 'contents' }}>
              <span className="hl">{h % 3 === 0 ? h : ''}</span>
              {DAYS.map((d, di) => {
                const c = GRID[di][hi];
                const k = `${d}-${h}`;
                let bg: string | undefined;
                if (c && by === 'Category') bg = categoryColour(c);
                if (c && by !== 'Category') {
                  const a = cellActivity(d, h, c);
                  if (a.name === by) bg = `color-mix(in oklab, ${categoryColour(c)} ${a.min >= 50 ? 100 : 50}%, var(--line))`;
                }
                const cls = ['cell', by === 'Category' && SWITCHY.has(k) ? 'sw' : '', sel === k ? 'sel' : ''].join(' ').trim();
                return <span key={k} data-cell={k} className={cls} style={bg ? { background: bg } : undefined} />;
              })}
            </div>
          );
        })}
      </div>
      <p className="readout" aria-live="polite">{readout}</p>
      <div className="legend">
        {by === 'Category' ? (
          <>
            {CATS.map((c) => <span key={c}><i style={{ background: categoryColour(c) }} />{c}</span>)}
            <span><i style={{ outline: '2px solid var(--text)', outlineOffset: -2 }} />Many switches</span>
          </>
        ) : (
          <>
            <span><i style={{ background: 'var(--line)' }} />None</span>
            <span><i style={{ background: `color-mix(in oklab, ${categoryColour(ACT_CAT[by])} 50%, var(--line))` }} />Under 30 min</span>
            <span><i style={{ background: categoryColour(ACT_CAT[by]) }} />30–60 min</span>
          </>
        )}
      </div>
    </section>
  );
}

function Spark({ values, colour, changeAt }: { values: number[]; colour: string; changeAt?: number }) {
  const W = 160, H = 34, MAX = 14; // one shared scale for every row, 0–14h
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => H - 3 - (v / MAX) * (H - 6);
  const last = values.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <line x1={0} x2={W} y1={H - 3} y2={H - 3} stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {changeAt !== undefined && (
        <line x1={x(changeAt - 0.5)} x2={x(changeAt - 0.5)} y1={0} y2={H} stroke="var(--muted)" strokeDasharray="3 3"
          strokeWidth={1} vectorEffect="non-scaling-stroke" />
      )}
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={colour} strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last)} cy={y(values[last])} r={4} fill={colour} stroke="var(--surface)" strokeWidth={2}
        vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Trends({ weeks, changeAt }: { weeks: number; changeAt?: number }) {
  return (
    <section className="panel" aria-labelledby="trend-h">
      <h2 id="trend-h">Last {weeks} weeks</h2>
      <p className="ins-sub">Hours per week, same scale on every row.{changeAt !== undefined && ' Dashed line: the change started.'}</p>
      <div className="trend">
        {CATS.map((c) => {
          const v = TREND[c].slice(0, weeks);
          return (
            <div key={c} style={{ display: 'contents' }}>
              <span className="n"><i style={{ background: categoryColour(c) }} />{c}</span>
              <div role="img" aria-label={`${c}: ${v.join(', ')} hours per week, oldest first`}>
                <Spark values={v} colour={categoryColour(c)} changeAt={c === 'Waste' ? changeAt : undefined} />
              </div>
              <span className="v">{v[v.length - 1]}h</span>
            </div>
          );
        })}
      </div>
      <div className="axis" aria-hidden="true"><span>{weeks === 8 ? 'Sep 21' : 'Sep 14'}</span><span>this week</span></div>
    </section>
  );
}

function InsightCard({ ins, open: openAtStart, accepted, onAccept, onDismiss }: {
  ins: Insight; open?: boolean; accepted: boolean; onAccept: () => void; onDismiss: () => void;
}) {
  const [open, setOpen] = useState(!!openAtStart);
  const e = ins.evidence;
  return (
    <article className="ins" aria-labelledby={`${ins.id}-f`}>
      <p className="f" id={`${ins.id}-f`}>{ins.finding}</p>
      <p className="d">{ins.detail}</p>
      <p className="try"><b>Try:</b> {ins.tryThis}</p>
      <button className="ev" aria-expanded={open} aria-controls={`${ins.id}-ev`} onClick={() => setOpen(!open)}>
        <span>Why: {e.label}</span><small>{open ? 'Hide' : 'Show'}</small>
      </button>
      {open && (
        <div className="evd" id={`${ins.id}-ev`}>
          <p><span className="k">What it showed</span>{e.shows}</p>
          {e.against && <p><span className="k">Against</span>{e.against}</p>}
          <p><span className="k">Limits</span>{e.limits}</p>
          <p><a href={e.url} target="_blank" rel="noreferrer">{e.source}</a></p>
        </div>
      )}
      <div className="row">
        {accepted
          ? <span className="changed">Next week’s change ✓</span>
          : <button className="primary small" onClick={onAccept}>Make it next week’s change</button>}
        <span className="row2">
          <button className="link" style={{ fontSize: 14 }}>See {ins.entries} Entries</button>
          <button className="link" style={{ fontSize: 14 }} onClick={onDismiss}>Not useful</button>
        </span>
      </div>
    </article>
  );
}

export type InsightsMockupProps = {
  /** 'ready' shows insights; 'too-early' shows the not-enough-data note. */
  state?: 'ready' | 'too-early';
  loggedDays?: number;
  openEvidence?: string;
  acceptedId?: string;
  /** Start with every insight listed, not only the first 3. */
  expanded?: boolean;
  /** Start with this insight just hidden by Not useful. */
  dismissedId?: string;
  /** Shows last week's change and whether it helped (next week's view). */
  lastWeek?: { change: string; result: string };
};

export function InsightsMockup({ state = 'ready', loggedDays = 7, openEvidence, acceptedId, expanded = false, dismissedId, lastWeek }: InsightsMockupProps) {
  const [accepted, setAccepted] = useState<string | undefined>(acceptedId);
  const [hidden, setHidden] = useState<string[]>(dismissedId ? [dismissedId] : []);
  const [lastHidden, setLastHidden] = useState<string | undefined>(dismissedId);
  const [reason, setReason] = useState('');
  const [saved, setSaved] = useState(false);
  const hide = (id: string) => { setHidden([...hidden, id]); setLastHidden(id); setReason(''); setSaved(false); };
  const [all, setAll] = useState(expanded);
  const left = INSIGHTS.filter((i) => !hidden.includes(i.id));
  const shown = all ? left : left.slice(0, FIRST);
  const rest = left.length - FIRST;
  return (
    <Phone tab="week">
      <style>{css}</style>
      <header className="day-head">
        <div>
          <h1>Week</h1>
          <p className="sub">{lastWeek ? 'Nov 9 – 15' : 'Nov 2 – 8'}</p>
        </div>
      </header>

      {lastWeek && (
        <div className="lastweek">
          <p>Last week’s change: “{lastWeek.change}”</p>
          <p className="res">{lastWeek.result}</p>
        </div>
      )}

      <section className="panel" aria-labelledby="ins-h">
        <h2 id="ins-h">Insights</h2>
        {state === 'too-early' ? (
          <p className="ins-sub">Insights appear after 5 logged days. {loggedDays} so far.</p>
        ) : (
          <>
            <p className="ins-sub">From this week’s log, most hours to win first. Each one says why it might help.</p>
            {shown.map((i) => (
              <InsightCard key={i.id} ins={i} open={openEvidence === i.id} accepted={accepted === i.id}
                onAccept={() => setAccepted(i.id)} onDismiss={() => hide(i.id)} />
            ))}
            {lastHidden && (
              <div className="hid" role="status">
                <div className="top">
                  <span>Hidden for 8 weeks</span>
                  <button className="link" onClick={() => { setHidden(hidden.filter((h) => h !== lastHidden)); setLastHidden(undefined); }}>Undo</button>
                </div>
                {saved ? <p className="saved">Saved. The coach will take it into account.</p> : (
                  <form onSubmit={(e) => { e.preventDefault(); setSaved(true); }}>
                    <input aria-label="Why not useful? (optional)" placeholder="Why? (optional)" maxLength={140}
                      value={reason} onChange={(e) => setReason(e.target.value)} />
                    <button className="secondary" type="submit" disabled={!reason.trim()}>Save</button>
                  </form>
                )}
              </div>
            )}
            {rest > 0 && (
              <button className="secondary more" aria-expanded={all} onClick={() => setAll(!all)}>
                {all ? 'Show fewer' : `See ${rest} more`}
              </button>
            )}
            {left.length === 0 && <p className="ins-sub">No more insights this week.</p>}
          </>
        )}
      </section>

      {state === 'ready' && <Heatmap />}
      {state === 'ready' && <Trends weeks={lastWeek ? 8 : 7} changeAt={lastWeek ? 7 : undefined} />}
      <p className="asis">Time per category, per activity and per day follow, as today.</p>
    </Phone>
  );
}
