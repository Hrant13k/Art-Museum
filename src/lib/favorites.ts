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
    if (!Array.isArray(all)) return [];
    // Tolerate corrupted/legacy rows: keep only well-formed { id, addedAt }.
    return all
      .filter((row) => row && typeof row.id === 'string')
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

/** Returns true on success. Never throws — storage may be unavailable. */
export async function addFavorite(id: string): Promise<boolean> {
  try {
    await (await db()).put(STORE, { id, addedAt: Date.now() });
    return true;
  } catch {
    return false;
  }
}

/** Returns true on success. Never throws. */
export async function removeFavorite(id: string): Promise<boolean> {
  try {
    await (await db()).delete(STORE, id);
    return true;
  } catch {
    return false;
  }
}

/** Returns the new favorite state (true = now a favorite). Never throws. */
export async function toggleFavorite(id: string): Promise<boolean> {
  const currently = await isFavorite(id);
  if (currently) {
    await removeFavorite(id);
    return false;
  }
  await addFavorite(id);
  return true;
}
