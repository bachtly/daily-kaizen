/** The floating + (05-ui D5): opens the Log now sheet from any screen. 60 px round, above the TabBar. */
export function LogFab({ onOpen }: { onOpen: (opener: HTMLElement) => void }) {
  return (
    <button className="fab" aria-label="Log now" onClick={(e) => onOpen(e.currentTarget)}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}
