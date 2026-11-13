import type { ActivityRow } from '../data/db';

/** Append `name` and a space to the text; the Log sheet's Activity chip does this so the AI sees the name in the text. */
export const insertActivity = (text: string, name: string) => `${text && !/\s$/.test(text) ? `${text} ` : text}${name} `;

/** The Activities most used around this time (up to 3): one tap puts the name in the text (AC-8.4). */
export function ActivityChips({ activities, onPick, disabled }: {
  activities: readonly ActivityRow[]; onPick: (name: string) => void; disabled?: boolean;
}) {
  if (activities.length === 0) return null;
  return (
    <div className="chips" role="group" aria-label="Activities">
      {activities.map((a) => (
        <button key={a.id} type="button" className="chip" onClick={() => onPick(a.name)} disabled={disabled}>{a.name}</button>
      ))}
    </div>
  );
}
