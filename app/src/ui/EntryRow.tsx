import type { CategoryRow, EntryRow as Entry } from '../data/db';
import { categoryColour, hhmm } from './weekFormat';

/**
 * One Entry in the This week list. Tap the text or times to edit it in place; tap the Tag to change it.
 * The "couldn't tag" note shows only when tagging gave up and the Entry has no Tag (AC-3.2).
 */
export function EntryRow({ entry, category, timeZone, onEdit, onTag }: {
  entry: Entry;
  category?: CategoryRow;
  timeZone: string;
  onEdit: () => void;
  onTag: (opener: HTMLElement) => void;
}) {
  const from = hhmm(Date.parse(entry.started_at), timeZone);
  const to = hhmm(Date.parse(entry.ended_at), timeZone);
  return (
    <div className="entry">
      <button className="what" onClick={onEdit} aria-label={`Edit ${entry.text}, ${from} to ${to}`}>
        <span className="text">{entry.text}</span>
        <span className="when">{from}–{to}</span>
      </button>
      <button
        className={category ? 'tag' : 'tag neutral'} style={category ? { background: categoryColour(category.name) } : undefined}
        onClick={(e) => onTag(e.currentTarget)} aria-label={`Category: ${category?.name ?? 'Untagged'}. Change`}
      >
        {category?.name ?? 'Untagged'} ▾
      </button>
      {!category && entry.tagging_gave_up_at && <span className="gaveup">Couldn't tag this one. Pick a category.</span>}
    </div>
  );
}
