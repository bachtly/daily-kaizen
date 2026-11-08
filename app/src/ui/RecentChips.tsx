/** The latest distinct texts: one tap instead of typing again (R8). Hidden when there are none. */
export function RecentChips({ texts, onPick, disabled }: {
  texts: readonly string[]; onPick: (text: string) => void; disabled?: boolean;
}) {
  if (texts.length === 0) return null;
  return (
    <div className="chips" role="group" aria-label="Recent">
      {texts.map((t) => (
        <button key={t} type="button" className="chip" onClick={() => onPick(t)} disabled={disabled}>{t}</button>
      ))}
    </div>
  );
}
