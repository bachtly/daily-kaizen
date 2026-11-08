import { zonedParts } from '../data/week';

const MINUTE = 60_000;

/** "12h 30m" (minutes rounded). */
export function formatDuration(ms: number): string {
  const m = Math.round(ms / MINUTE);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

const KNOWN = ['deep', 'shallow', 'maintenance', 'recovery', 'waste'];
/** Fixed muted colour per Category; new Categories share one. */
export const categoryColour = (name: string) => `var(--cat-${KNOWN.includes(name.toLowerCase()) ? name.toLowerCase() : 'new'})`;

/** HH:MM wall-clock time of an instant in a zone. */
export const hhmm = (ms: number, tz: string) => {
  const p = zonedParts(ms, tz);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
};

/** Move `ms` to the wall-clock time `value` (HH:MM) on the same day in the zone. */
export const withTime = (ms: number, value: string, tz: string) => {
  const [h, m] = value.split(':').map(Number);
  const p = zonedParts(ms, tz);
  return ms + ((h - p.hour) * 60 + (m - p.minute)) * MINUTE - p.second * 1000;
};
