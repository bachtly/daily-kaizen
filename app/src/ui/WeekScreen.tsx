import { useState } from 'react';
import { ConnectionBanner, Phone, type Connection } from './Phone';
import { TimeChip } from './LogForm';
import { categories, entries as allEntries, formatMinutes, suggestedAdmin, totals as allTotals, type Category, type Entry, type Total } from './mock';

export type WeekScreenProps = {
  connection?: Connection;
  weekLabel?: string;
  isCurrentWeek?: boolean;
  reviewDone?: boolean;
  refreshedAt?: string;
  totals?: Total[];
  entries?: Entry[];
  suggestion?: Category | null;
  /** Earlier week that isn't in the Local copy. */
  load?: 'ready' | 'loading' | 'offline-earlier-week';
  openPickerFor?: string;
  /** Entry shown expanded for inline editing. */
  editing?: string;
};

/** This week page: time per Category, Suggested categories, Entries, Review done (UC-4). */
export function WeekScreen({
  connection = 'online', weekLabel = 'Week of 3 Nov', isCurrentWeek = true, reviewDone = false,
  refreshedAt = '14:02', totals = allTotals, entries = allEntries, suggestion = suggestedAdmin,
  load = 'ready', openPickerFor, editing,
}: WeekScreenProps) {
  const [pickerFor, setPickerFor] = useState<string | undefined>(openPickerFor);
  const [list, setList] = useState(entries);
  const [editId, setEditId] = useState<string | undefined>(editing);
  const [done, setDone] = useState(reviewDone);
  const max = Math.max(...totals.map((t) => t.minutes), 1);
  const days = [...new Set(list.map((e) => e.day))];
  const pickerEntry = list.find((e) => e.id === pickerFor);

  return (
    <Phone
      tab="week"
      overlay={pickerEntry && <TagPicker entry={pickerEntry} onClose={() => setPickerFor(undefined)} />}
    >
      <ConnectionBanner state={connection} refreshedAt={refreshedAt} />
      <header className="week-header">
        <div className="week-picker" role="group" aria-label="Choose week">
          <button aria-label="Previous week">‹</button>
          <h1>{weekLabel}</h1>
          <button aria-label="Next week" disabled={isCurrentWeek}>›</button>
        </div>
        <div className="week-meta">
          <span className={done ? 'badge done' : 'badge'}>{done ? 'Review done ✓' : 'Not reviewed'}</span>
          <span className="refreshed">Updated {refreshedAt}</span>
        </div>
      </header>

      {load === 'loading' && <>{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" />)}</>}
      {load === 'offline-earlier-week' && (
        <div className="empty">Earlier weeks need a connection.<div><button className="secondary" style={{ marginTop: 12 }}>Retry</button></div></div>
      )}

      {load === 'ready' && (
        <>
          <section className="panel" aria-labelledby="totals-h">
          <h2 id="totals-h">Time per category</h2>
          <ul className="totals">
            {totals.map((t) => (
              <li key={t.id} className={t.neutral ? 'neutral' : undefined}>
                <span>{t.label}</span>
                <span className="bar" style={{ width: `${(t.minutes / max) * 100}%`, background: t.colour }} />
                <span className="val">{formatMinutes(t.minutes)}</span>
              </li>
            ))}
          </ul>
          </section>

          {suggestion && (
            <div className="card" role="group" aria-label="Suggested category">
              <div className="title">Suggested category: {suggestion.name}</div>
              <div className="desc">"{suggestion.description}"</div>
              <div className="desc">{moveCount(entries, suggestion.id)}</div>
              <div className="row-actions">
                <button className="secondary">Approve</button>
                <button className="secondary">Reject</button>
              </div>
            </div>
          )}

          {entries.length === 0 && (
            <div className="empty">Nothing logged this week yet.<div><button className="secondary" style={{ marginTop: 12 }}>Log something</button></div></div>
          )}

          {days.map((day) => (
            <section key={day} className="panel" aria-label={day}>
              <h2 className="day">{day}</h2>
              {list.filter((e) => e.day === day).map((e) => (
                e.id === editId
                  ? <EntryEditor
                      key={e.id} entry={e} online={connection === 'online'}
                      onCancel={() => setEditId(undefined)}
                      onSave={(next) => { setList((l) => l.map((x) => (x.id === next.id ? next : x))); setEditId(undefined); }}
                      onDelete={() => { setList((l) => l.filter((x) => x.id !== e.id)); setEditId(undefined); }}
                    />
                  : <EntryRow key={e.id} entry={e} onEdit={() => setEditId(e.id)} onTag={() => setPickerFor(e.id)} />
              ))}
            </section>
          ))}

          {entries.length > 0 && !done && (
            <button className="primary" onClick={() => setDone(true)}>Mark review done</button>
          )}
        </>
      )}
    </Phone>
  );
}

function EntryRow({ entry, onEdit, onTag }: { entry: Entry; onEdit: () => void; onTag: () => void }) {
  const cat = categories.find((c) => c.id === entry.categoryId);
  return (
    <div className="entry">
      <button className="when" onClick={onEdit} aria-label={`Edit times ${entry.start} to ${entry.end}`}>{entry.start}–{entry.end}</button>
      <button className="what" onClick={onEdit}>{entry.text}</button>
      <button
        className={cat ? 'tag' : 'tag neutral'} style={cat ? { background: cat.colour } : undefined}
        onClick={onTag} aria-label={`Category: ${cat?.name ?? 'Untagged'}. Change`}
      >
        {cat?.name ?? 'Untagged'} ▾
      </button>
      {!cat && entry.taggingGaveUp && <span className="gaveup">Couldn't tag this one. Pick a category.</span>}
    </div>
  );
}

/**
 * Inline editor: the row expands in place (one at a time). Save needs a connection (ADR 0004).
 * Changing the text re-tags the Entry unless I picked its Tag myself (Tag source).
 */
function EntryEditor({ entry, online, onSave, onCancel, onDelete }: {
  entry: Entry; online: boolean; onSave: (e: Entry) => void; onCancel: () => void; onDelete: () => void;
}) {
  const [text, setText] = useState(entry.text);
  const [from, setFrom] = useState(entry.start);
  const [to, setTo] = useState(entry.end);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const error = from >= to ? 'From must be before To.' : !text.trim() ? 'Activity is required.' : undefined;
  const save = () => {
    setSaving(true);
    setTimeout(() => onSave({ ...entry, text, start: from, end: to }), 700);
  };
  return (
    <div className="entry-edit" role="group" aria-label={`Edit ${entry.text}`}>
      <input
        className="text" aria-label="Activity" autoFocus value={text} readOnly={saving}
        onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !error && online && save()}
      />
      <div className="times">
        <TimeChip label="From" value={from} onChange={setFrom} disabled={saving} invalid={from >= to} />
        <TimeChip label="To" value={to} onChange={setTo} disabled={saving} invalid={from >= to} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!online && <p className="note">Saving needs a connection.</p>}
      <div className="row-actions">
        <button className="primary small" onClick={save} disabled={saving || !!error || !online}>{saving ? 'Saving…' : 'Save'}</button>
        <button className="secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        {!confirmDelete
          ? <button className="link danger" onClick={() => setConfirmDelete(true)} disabled={saving || !online}>Delete</button>
          : <span>Delete? <button className="link danger" onClick={onDelete}>Yes</button> <button className="link" onClick={() => setConfirmDelete(false)}>No</button></span>}
      </div>
    </div>
  );
}

/** Sheet to change an Entry's Tag; Active Categories only (AC-4.1). */
function TagPicker({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={`Category for ${entry.text}`} onClick={(e) => e.stopPropagation()}>
        <strong>{entry.text}</strong>
        <ul>
          {categories.map((c) => (
            <li key={c.id}>
              <button onClick={onClose}>
                <span className="dot" style={{ background: c.colour }} />
                {c.name}{c.id === entry.categoryId ? ' ✓' : ''}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function moveCount(entries: Entry[], categoryId: string): string {
  const n = entries.filter((e) => e.suggestedCategoryId === categoryId).length;
  return `${n} ${n === 1 ? 'Entry' : 'Entries'} would move.`;
}
