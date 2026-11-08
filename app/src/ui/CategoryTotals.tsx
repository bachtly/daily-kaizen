import type { CategoryRow } from '../data/db';
import type { WeekTotals } from '../data/week';
import { categoryColour, formatDuration } from './weekFormat';


type Row = { id: string; label: string; ms: number; colour?: string; neutral?: boolean };

/**
 * Time per Category (AC-5.1). Untagged and Unlogged are plain grey rows. A week with no Entries shows only Unlogged.
 * Every bar has its text value, so colour is never the only signal.
 */
export function CategoryTotals({ totals, categories, hasEntries }: {
  totals: WeekTotals; categories: readonly CategoryRow[]; hasEntries: boolean;
}) {
  const rows: Row[] = [];
  if (hasEntries) {
    for (const c of categories) {
      const ms = totals.byCategory[c.id] ?? 0;
      if (c.status === 'active' || ms > 0) rows.push({ id: c.id, label: c.name, ms, colour: categoryColour(c.name) });
    }
    if (totals.untaggedMs > 0) rows.push({ id: 'untagged', label: 'Untagged', ms: totals.untaggedMs, neutral: true });
  }
  rows.push({ id: 'unlogged', label: 'Unlogged', ms: totals.unloggedMs, neutral: true });
  // Bars scale to the largest logged row; Unlogged is usually far larger, so its bar is capped at full width.
  const max = Math.max(...rows.filter((r) => r.id !== 'unlogged').map((r) => r.ms), 1);
  return (
    <section className="panel" aria-labelledby="totals-h">
      <h2 id="totals-h">Time per category</h2>
      <ul className="totals">
        {rows.map((r) => (
          <li key={r.id} className={r.neutral ? 'neutral' : undefined}>
            <span>{r.label}</span>
            <span className="bar" style={{ width: `${Math.min(r.ms / max, 1) * 100}%`, background: r.colour ?? 'var(--neutral-bar)' }} />
            <span className="val">{formatDuration(r.ms)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
