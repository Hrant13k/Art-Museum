'use client';

import { useCallback, useEffect, useState } from 'react';
import { getFavoriteIds, toggleFavorite as toggle } from './favorites';
import { subscribe, emit } from './events';

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
    return subscribe('favorites', refresh);
  }, [refresh]);

  const toggleFavorite = useCallback(async (id: string) => {
    const result = await toggle(id);
    emit('favorites');
    return result;
  }, []);

  return {
    ids,
    set: new Set(ids),
    ready,
    isFavorite: (id: string) => ids.includes(id),
    toggleFavorite,
  };
}
