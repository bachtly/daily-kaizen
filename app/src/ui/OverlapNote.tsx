/** AC-1.2: a warning, never a block. Names the first overlapping Entry. */
export function OverlapNote({ with: label }: { with?: string }) {
  if (!label) return null;
  return <p className="note warn" role="status">Overlaps "{label}". It will still be saved.</p>;
}
