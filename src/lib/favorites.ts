// Favorites persistence using IndexedDB. We store only artwork ids — the full
// artwork records live in the app bundle — so favorites work fully offline and
// without any account or network.
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'art-museum';
const STORE = 'favorites';

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in the browser.'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getFavoriteIds(): Promise<string[]> {
  try {
    const all = await (await db()).getAll(STORE);
    return all
      .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
      .map((row) => row.id as string);
  } catch {
    return [];
  }
}

export async function isFavorite(id: string): Promise<boolean> {
  try {
    return Boolean(await (await db()).get(STORE, id));
  } catch {
    return false;
  }
}

export async function addFavorite(id: string): Promise<void> {
  await (await db()).put(STORE, { id, addedAt: Date.now() });
}

export async function removeFavorite(id: string): Promise<void> {
  await (await db()).delete(STORE, id);
}

/** Returns the new favorite state (true = now a favorite). */
export async function toggleFavorite(id: string): Promise<boolean> {
  if (await isFavorite(id)) {
    await removeFavorite(id);
    return false;
  }
  await addFavorite(id);
  return true;
}
