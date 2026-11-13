import { useState } from 'react';
import { Phone } from '../Phone';
import { categoryColour } from '../weekFormat';

/**
 * Mockup for #80 (deep analysis). Not wired to the app: static week, static insights.
 * It shows where insights sit on the Week page and how each one carries its evidence.
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
    finding: 'Your Deep blocks of 50–70 min ended on plan most often',
    detail: '5 of 6 such blocks ended when planned; blocks over 2h were cut short by Waste 3 of 4 times.',
    tryThis: 'If I start Deep work, then I plan about 60 min and choose my own break.',
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
];

// ---- Week heatmap data: hour 6..22, Mon..Sun ----
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const workday: (Cat | null)[] = [
  null, 'Maintenance', null, 'Deep', 'Deep', 'Shallow', 'Maintenance', 'Recovery', 'Deep', 'Deep', 'Shallow',
  'Maintenance', 'Recovery', 'Recovery', 'Recovery', 'Waste', 'Waste',
];
const weekend: (Cat | null)[] = [
  null, null, null, 'Recovery', 'Maintenance', 'Maintenance', 'Recovery', 'Recovery', 'Waste', 'Recovery', 'Recovery',
  'Maintenance', 'Recovery', 'Waste', 'Waste', 'Waste', 'Waste',
];
const GRID: (Cat | null)[][] = DAYS.map((d, i) => {
  const row = [...(i < 5 ? workday : weekend)];
  if (d === 'Wed') { row[3] = 'Shallow'; row[4] = 'Deep'; } // the switching morning
  if (d === 'Thu') { row[16] = 'Recovery'; }
  return row;
});
const SWITCHY = new Set(['Wed-9', 'Wed-10']);
const CATS: Cat[] = ['Deep', 'Shallow', 'Maintenance', 'Recovery', 'Waste'];

const css = `
.ins-sub { color: var(--muted); font-size: 14px; margin: 0 0 4px; }
.heat { display: grid; grid-template-columns: 30px repeat(17, minmax(0, 1fr)); gap: 2px; font-size: 11px; color: var(--muted); }
.heat .cell { height: 16px; border-radius: 3px; background: var(--line); }
.heat .cell.sw { outline: 2px solid var(--text); outline-offset: -2px; }
.heat .hl { text-align: center; font-variant-numeric: tabular-nums; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 10px; font-size: 13px; color: var(--muted); }
.legend span { display: inline-flex; align-items: center; gap: 5px; }
.legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
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
.changed { color: var(--done-text); font-weight: 600; font-size: 15px; }
.lastweek { border: 1px solid var(--accent); border-radius: 14px; padding: 12px 14px; margin-top: 12px; }
.lastweek p { margin: 0; }
.lastweek .res { margin-top: 6px; font-size: 14px; color: var(--done-text); font-weight: 600; }
.asis { color: var(--muted); font-size: 14px; text-align: center; padding: 16px 0 8px; }
`;

function Heatmap() {
  return (
    <section className="panel" aria-labelledby="heat-h">
      <h2 id="heat-h">When</h2>
      <div className="heat" role="img"
        aria-label="Hours of the week by category. Waste is mostly after 21:00; Wednesday 9 to 11 has many switches.">
        <span />
        {HOURS.map((h) => <span key={h} className="hl">{h % 3 === 0 ? h : ''}</span>)}
        {DAYS.map((d, di) => (
          <div key={d} style={{ display: 'contents' }}>
            <span>{d}</span>
            {GRID[di].map((c, hi) => (
              <span key={hi} className={SWITCHY.has(`${d}-${HOURS[hi]}`) ? 'cell sw' : 'cell'}
                style={c ? { background: categoryColour(c) } : undefined} />
            ))}
          </div>
        ))}
      </div>
      <div className="legend">
        {CATS.map((c) => <span key={c}><i style={{ background: categoryColour(c) }} />{c}</span>)}
        <span><i style={{ outline: '2px solid var(--text)', outlineOffset: -2 }} />Many switches</span>
      </div>
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
        <button className="link" onClick={onDismiss}>Not useful</button>
      </div>
      <button className="link" style={{ fontSize: 14 }}>See the {ins.entries} Entries</button>
    </article>
  );
}

export type InsightsMockupProps = {
  /** 'ready' shows insights; 'too-early' shows the not-enough-data note. */
  state?: 'ready' | 'too-early';
  loggedDays?: number;
  openEvidence?: string;
  acceptedId?: string;
  /** Shows last week's change and whether it helped (next week's view). */
  lastWeek?: { change: string; result: string };
};

export function InsightsMockup({ state = 'ready', loggedDays = 7, openEvidence, acceptedId, lastWeek }: InsightsMockupProps) {
  const [accepted, setAccepted] = useState<string | undefined>(acceptedId);
  const [hidden, setHidden] = useState<string[]>([]);
  const shown = INSIGHTS.filter((i) => !hidden.includes(i.id));
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
            <p className="ins-sub">From this week’s log. Each one says why it might help.</p>
            {shown.map((i) => (
              <InsightCard key={i.id} ins={i} open={openEvidence === i.id} accepted={accepted === i.id}
                onAccept={() => setAccepted(i.id)} onDismiss={() => setHidden([...hidden, i.id])} />
            ))}
            {shown.length === 0 && <p className="ins-sub">No more insights this week.</p>}
          </>
        )}
      </section>

      {state === 'ready' && <Heatmap />}
      <p className="asis">Time per category, per activity and per day follow, as today.</p>
    </Phone>
  );
}
