import { Skeleton } from './Skeleton';

/** The latest distinct texts: one tap instead of typing again (R8). Hidden when there are none. */
export function RecentChips({ texts, onPick, disabled, loading }: {
  loading?: boolean; texts: readonly string[]; onPick: (text: string) => void; disabled?: boolean;
}) {
  if (loading) {
    return <div className="chips" aria-hidden="true">{[88, 120, 72].map((w) => <Skeleton key={w} height={44} width={w} radius={22} />)}</div>;
  }
  if (texts.length === 0) return null;
  return (
    <div className="chips" role="group" aria-label="Recent">
      {texts.map((t) => (
        <button key={t} type="button" className="chip" onClick={() => onPick(t)} disabled={disabled}>{t}</button>
      ))}
    </div>
  );
}
