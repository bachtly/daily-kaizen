/** When the Local copy was last refreshed (AC-2.4), as a clock time in the user's zone. */
export function RefreshedAt({ time }: { time: string | null }) {
  return <span className="refreshed">{time ? `Updated ${time}` : 'Not updated yet'}</span>;
}
