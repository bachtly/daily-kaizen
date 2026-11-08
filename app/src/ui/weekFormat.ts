const MINUTE = 60_000;

/** "12h 30m" (minutes rounded). */
export function formatDuration(ms: number): string {
  const m = Math.round(ms / MINUTE);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

const KNOWN = ['deep', 'shallow', 'maintenance', 'recovery', 'waste'];
/** Fixed muted colour per Category; new Categories share one. */
export const categoryColour = (name: string) => `var(--cat-${KNOWN.includes(name.toLowerCase()) ? name.toLowerCase() : 'new'})`;
