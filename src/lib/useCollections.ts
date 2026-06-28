'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  type Collection,
  getCollections,
  getCollectionCounts,
  createCollection as create,
  renameCollection as rename,
  deleteCollection as remove,
} from './collections';
import { subscribe, emit } from './events';

/** Reactive list of the user's collections, with item counts. */
export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const [list, c] = await Promise.all([getCollections(), getCollectionCounts()]);
    setCollections(list);
    setCounts(c);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    return subscribe('collections', refresh);
  }, [refresh]);

  const createCollection = useCallback(async (name: string) => {
    const result = await create(name);
    emit('collections');
    return result;
  }, []);

  const renameCollection = useCallback(async (id: string, name: string) => {
    const ok = await rename(id, name);
    emit('collections');
    return ok;
  }, []);

  const deleteCollection = useCallback(async (id: string) => {
    const ok = await remove(id);
    emit('collections');
    return ok;
  }, []);

  return { collections, counts, ready, refresh, createCollection, renameCollection, deleteCollection };
}
