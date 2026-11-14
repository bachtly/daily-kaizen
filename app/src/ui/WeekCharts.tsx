import { useMemo, useState, type MouseEvent } from 'react';
import type { ActivityRow, CategoryRow } from '../data/db';
import { topCategory, UNTAGGED, type WeekFacts } from '../data/facts';
import { categoryColour } from './weekFormat';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MANY_SWITCHES = 3;
const MAX_ACTIVITY_CHIPS = 7;
const pad = (h: number) => String(h).padStart(2, '0');

/** When: days × hours with Entries, coloured by Category, or one Activity's minutes (design §10). Tap an hour for what was in it. */
export function WeekHeatmap({ facts, categories, activities }: {
  facts: WeekFacts;
  categories: readonly CategoryRow[];
  activities: readonly ActivityRow[];
}) {
  const [by, setBy] = useState<string>('category');
  const [sel, setSel] = useState<number | null>(null);
  const catName = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const actName = useMemo(() => Object.fromEntries(activities.map((a) => [a.id, a.name])), [activities]);
  const colourOf = (catId: string | null) =>
    catId === null ? undefined : catId === UNTAGGED ? 'var(--muted)' : categoryColour(catName[catId] ?? '');

  const hours = useMemo(() => {
    const used = Array.from({ length: 24 }, (_, h) => DAYS.some((_, d) => Object.keys(facts.hours[d * 24 + h].cat).length > 0));
    const from = used.indexOf(true);
    const to = used.lastIndexOf(true);
    return from < 0 ? [] : Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [facts]);
  const topActs = useMemo(
    () => Object.entries(facts.byActivity).filter(([id]) => actName[id]).sort((a, b) => b[1].total - a[1].total)
      .slice(0, MAX_ACTIVITY_CHIPS).map(([id]) => id),
    [facts, actName],
  );
  // An Activity's colour: the Category it had most this week.
  const actColour = (id: string) => {
    const cats = Object.entries(facts.byActivity[id]?.byCategory ?? {}).sort((a, b) => b[1] - a[1]);
    return colourOf(cats[0]?.[0] ?? null) ?? 'var(--accent)';
  };

  if (hours.length === 0) return null;

  const pick = (ev: MouseEvent) => {
    const c = (ev.target as HTMLElement).dataset.cell;
    if (c !== undefined) setSel(Number(c));
  };
  let readout = 'Tap an hour to see what was in it.';
  if (sel !== null) {
    const cell = facts.hours[sel];
    const top = topCategory(cell);
    const act = Object.entries(cell.act).sort((a, b) => b[1] - a[1])[0];
    readout = `${DAYS[Math.floor(sel / 24)]} ${pad(sel % 24)}:00 · `;
    readout += top
      ? `${top === UNTAGGED ? 'Untagged' : catName[top] ?? 'Category'}${act && actName[act[0]] ? ` · ${actName[act[0]]} ${act[1]} min` : ''}`
      : 'nothing logged';
    if (cell.switches >= MANY_SWITCHES) readout += ` · ${cell.switches} switches`;
  }
  const label = by === 'category'
    ? 'Hours of the week by Category, with hours of many switches outlined. Tap an hour for details.'
    : `Hours of the week with ${actName[by]}, darker means more minutes.`;
  const legendCats = categories.filter((c) => c.status === 'active');

  return (
    <section className="panel" aria-labelledby="heat-h">
      <h2 id="heat-h">When</h2>
      <div className="chips by" role="group" aria-label="Show">
        <button className="chip" aria-pressed={by === 'category'} onClick={() => setBy('category')}>Category</button>
        {topActs.map((id) => (
          <button key={id} className="chip" aria-pressed={by === id} onClick={() => setBy(id)}>{actName[id]}</button>
        ))}
      </div>
      <div className="heat" role="img" aria-label={label} onClick={pick}>
        <span />
        {DAYS.map((d) => <span key={d} className="dl">{d}</span>)}
        {hours.map((h) => (
          <div key={h} style={{ display: 'contents' }}>
            <span className="hl">{h % 3 === 0 ? h : ''}</span>
            {DAYS.map((_, d) => {
              const i = d * 24 + h;
              const cell = facts.hours[i];
              let bg: string | undefined;
              if (by === 'category') bg = colourOf(topCategory(cell));
              else if (cell.act[by]) bg = cell.act[by] >= 30 ? actColour(by) : `color-mix(in oklab, ${actColour(by)} 50%, var(--line))`;
              const cls = ['cell', by === 'category' && cell.switches >= MANY_SWITCHES ? 'sw' : '', sel === i ? 'sel' : ''].join(' ').trim();
              return <span key={i} data-cell={i} className={cls} style={bg ? { background: bg } : undefined} />;
            })}
          </div>
        ))}
      </div>
      <p className="readout" aria-live="polite">{readout}</p>
      <div className="legend">
        {by === 'category' ? (
          <>
            {legendCats.map((c) => <span key={c.id}><i style={{ background: categoryColour(c.name) }} />{c.name}</span>)}
            <span><i style={{ outline: '2px solid var(--text)', outlineOffset: -2 }} />Many switches</span>
          </>
        ) : (
          <>
            <span><i style={{ background: 'var(--line)' }} />None</span>
            <span><i style={{ background: `color-mix(in oklab, ${actColour(by)} 50%, var(--line))` }} />Under 30 min</span>
            <span><i style={{ background: actColour(by) }} />30–60 min</span>
          </>
        )}
      </div>
    </section>
  );
}

const ROLE_ORDER = ['deep', 'shallow', 'maintenance', 'recovery', 'waste'];

function Spark({ values, colour, changeAt, max }: { values: number[]; colour: string; changeAt: number | null; max: number }) {
  const W = 160, H = 34;
  const x = (i: number) => (values.length < 2 ? W : (i / (values.length - 1)) * W);
  const y = (v: number) => H - 3 - (v / max) * (H - 6);
  const last = values.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <line x1={0} x2={W} y1={H - 3} y2={H - 3} stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {changeAt !== null && changeAt > 0 && (
        <line x1={x(changeAt - 0.5)} x2={x(changeAt - 0.5)} y1={0} y2={H} stroke="var(--muted)" strokeDasharray="3 3"
          strokeWidth={1} vectorEffect="non-scaling-stroke" />
      )}
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={colour} strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last)} cy={y(values[last])} r={4} fill={colour} stroke="var(--surface)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Last N weeks: one line per Category, hours per week on one shared scale; a dashed line where a change started. */
export function TrendPanel({ weeks, categories, changeWeek }: {
  /** oldest first; the last one is this week (so far) */
  weeks: readonly WeekFacts[];
  categories: readonly CategoryRow[];
  /** the first week a change ran, or null */
  changeWeek: string | null;
}) {
  const rows = ROLE_ORDER
    .map((r) => categories.find((c) => c.name.trim().toLowerCase() === r))
    .filter((c): c is CategoryRow => !!c);
  if (weeks.length < 2 || rows.length === 0) return null;
  const hoursOf = (f: WeekFacts, id: string) => Math.round(((f.minutes.byCategory[id] ?? 0) / 60) * 10) / 10;
  const max = Math.max(14, ...weeks.flatMap((f) => rows.map((c) => hoursOf(f, c.id))));
  const changeAt = changeWeek ? weeks.findIndex((f) => f.weekStart >= changeWeek) : -1;
  const first = weeks[0].weekStart;
  const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(Date.parse(`${first}T00:00:00Z`));
  return (
    <section className="panel" aria-labelledby="trend-h">
      <h2 id="trend-h">Last {weeks.length} weeks</h2>
      <p className="ins-sub">Hours per week, same scale on every row.{changeAt > 0 && ' Dashed line: the change started.'}</p>
      <div className="trend">
        {rows.map((c) => {
          const v = weeks.map((f) => hoursOf(f, c.id));
          return (
            <div key={c.id} style={{ display: 'contents' }}>
              <span className="n"><i style={{ background: categoryColour(c.name) }} />{c.name}</span>
              <div role="img" aria-label={`${c.name}: ${v.join(', ')} hours per week, oldest first, this week so far last`}>
                <Spark values={v} colour={categoryColour(c.name)} changeAt={changeAt > 0 ? changeAt : null} max={max} />
              </div>
              <span className="v">{v[v.length - 1]}h</span>
            </div>
          );
        })}
      </div>
      <div className="axis" aria-hidden="true"><span>{fmt}</span><span>this week</span></div>
    </section>
  );
}
