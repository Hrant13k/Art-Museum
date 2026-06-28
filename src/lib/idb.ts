// Centralized IndexedDB access for all on-device user data (favorites and
// personal collections). One database, opened once, shared by every module so
// the version/upgrade is defined in a single place. Everything stays on the
// device — no account, no network — and works fully offline.
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'art-museum';
const DB_VERSION = 2;

export const STORE_FAVORITES = 'favorites';
export const STORE_COLLECTIONS = 'collections';
export const STORE_COLLECTION_ITEMS = 'collectionItems';
export const IDX_BY_COLLECTION = 'by-collection';
export const IDX_BY_ARTWORK = 'by-artwork';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in the browser.'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      // Upgrades run in order; existing data (e.g. favorites) is preserved.
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          database.createObjectStore(STORE_FAVORITES, { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          database.createObjectStore(STORE_COLLECTIONS, { keyPath: 'id' });
          const items = database.createObjectStore(STORE_COLLECTION_ITEMS, {
            keyPath: ['collectionId', 'artworkId'],
          });
          items.createIndex(IDX_BY_COLLECTION, 'collectionId');
          items.createIndex(IDX_BY_ARTWORK, 'artworkId');
        }
      },
      // If another tab opens a newer version, let this connection close cleanly.
      terminated() {
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

/** A stable unique id for a new collection. */
export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `c-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}
