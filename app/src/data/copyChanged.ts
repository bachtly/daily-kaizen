const listeners = new Set<() => void>();

/** Call `cb` each time a refresh has replaced the Local copy. Returns the unsubscribe. */
export function onCopyChanged(cb: () => void): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

export function emitCopyChanged() {
  listeners.forEach((cb) => cb());
}
