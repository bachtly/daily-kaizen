import { useCallback, useEffect, useState } from 'react';

import { onCopyChanged } from '../data/copyChanged';
import { readLocalCopy, type LocalCopy } from '../data/localCopy';

const EMPTY: LocalCopy = { entries: [], categories: [], settings: null, reviews: [], refreshedAt: null };

/**
 * The Local copy for a screen, with an explicit `ready` flag: false until the first read has finished (also when it fails).
 * Until then `copy` is empty, and a screen must show a Skeleton for anything it takes from it, never a default as if it were real.
 * It reads again after each refresh.
 */
export function useLocalCopy() {
  const [copy, setCopy] = useState<LocalCopy>(EMPTY);
  const [ready, setReady] = useState(false);
  const reload = useCallback(async () => {
    try {
      setCopy(await readLocalCopy());
    } catch {
      // Storage unavailable: keep what we have.
    }
    setReady(true);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(reload);
    return onCopyChanged(() => void reload());
  }, [reload]);
  return { copy, ready, reload };
}
