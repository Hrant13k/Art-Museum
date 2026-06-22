'use client';

import { useCallback, useEffect, useState } from 'react';
import { getFavoriteIds, toggleFavorite as toggle } from './favorites';

// A tiny event bus so every mounted component stays in sync when favorites change.
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

/** Reactive set of favorite artwork ids. */
export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    setIds(await getFavoriteIds());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, [refresh]);

  const toggleFavorite = useCallback(async (id: string) => {
    const result = await toggle(id);
    await refresh();
    notify();
    return result;
  }, [refresh]);

  return {
    ids,
    set: new Set(ids),
    ready,
    isFavorite: (id: string) => ids.includes(id),
    toggleFavorite,
  };
}
