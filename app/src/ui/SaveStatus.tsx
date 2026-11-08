export type SaveState = 'idle' | 'saving' | 'saved' | 'unknown' | 'server';

/** Shows done only after the Server confirms (AC-2.1). A lost result keeps the text; Save again is safe (AC-2.2). */
export function SaveStatus({ state }: { state: SaveState }) {
  const text: Partial<Record<SaveState, string>> = {
    saved: 'Saved.',
    unknown: 'Needs a connection. Your text is kept. Tap Save again.',
    server: "Couldn't save. Try again.",
  };
  const isError = state === 'unknown' || state === 'server';
  return <p className={isError ? 'error' : 'status'} role={isError ? 'alert' : undefined} aria-live="polite">{text[state] ?? ''}</p>;
}
