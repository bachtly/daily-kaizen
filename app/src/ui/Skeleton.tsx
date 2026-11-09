import type { CSSProperties } from 'react';

/**
 * The one loading placeholder (05-ui States). A grey block the size of the content it stands for, so nothing jumps when the data
 * arrives. It stays invisible for the first 150 ms (CSS), so a fast read never flashes it, and the pulse stops under
 * prefers-reduced-motion. Screens mark the whole page with `<Phone busy>` (aria-busy) while any block is loading.
 */
export function Skeleton({ height = 18, width, radius, style }: {
  height?: number; width?: number | string; radius?: number; style?: CSSProperties;
}) {
  return <span className="skeleton" aria-hidden="true" style={{ height, width, borderRadius: radius, ...style }} />;
}
