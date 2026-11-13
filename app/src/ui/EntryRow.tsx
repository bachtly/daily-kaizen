import type { ActivityRow, CategoryRow, EntryRow as Entry } from '../data/db';
import { categoryColour, hhmm } from './weekFormat';

/**
 * One Entry in the Day view list. Tap the text or times to edit it in place; tap the Tag to change it.
 * The "couldn't tag" note shows only when tagging gave up and the Entry has no Tag (AC-3.2).
 */
export function EntryRow({ entry, category, activities = [], timeZone, onEdit, onTag }: {
  entry: Entry;
  category?: CategoryRow;
  /** Shown after the text as "A · B" when the Entry has any. */
  activities?: readonly ActivityRow[];
  timeZone: string;
  onEdit: () => void;
  onTag: (opener: HTMLElement) => void;
}) {
  const from = hhmm(Date.parse(entry.started_at), timeZone);
  const to = hhmm(Date.parse(entry.ended_at), timeZone);
  const names = activities.map((a) => a.name).join(' · ');
  return (
    <div className="entry">
      <button className="what" onClick={onEdit} aria-label={`Edit ${entry.text}, ${from}–${to}${names ? `, ${names}` : ''}`}>
        <span className="text">{entry.text}</span>{' '}
        <span className="when">{from}–{to}</span>
        {names && <>{' '}<span className="act">{names}</span></>}
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
