// Personal collections — user-curated folders of saved artworks, stored on the
// device in IndexedDB. Collections are independent of Favorites: adding an
// artwork to a collection also saves it (so your library stays the superset),
// but removing it from a collection — or deleting the collection entirely —
// never removes it from Favorites.
import {
  getDB,
  STORE_COLLECTIONS,
  STORE_COLLECTION_ITEMS,
  IDX_BY_COLLECTION,
  IDX_BY_ARTWORK,
  newId,
} from './idb';
import { addFavorite } from './favorites';

export type Collection = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

type Item = { collectionId: string; artworkId: string; addedAt: number };

/** All collections, most recently updated first. Never throws. */
export async function getCollections(): Promise<Collection[]> {
  try {
    const all = (await (await getDB()).getAll(STORE_COLLECTIONS)) as Collection[];
    if (!Array.isArray(all)) return [];
    return all
      .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  } catch {
    return [];
  }
}

export async function getCollection(id: string): Promise<Collection | null> {
  try {
    return ((await (await getDB()).get(STORE_COLLECTIONS, id)) as Collection) ?? null;
  } catch {
    return null;
  }
}

/** Create a collection. Returns the new record, or null on failure. */
export async function createCollection(name: string): Promise<Collection | null> {
  const clean = name.trim();
  if (!clean) return null;
  try {
    const now = Date.now();
    const collection: Collection = { id: newId(), name: clean, createdAt: now, updatedAt: now };
    await (await getDB()).put(STORE_COLLECTIONS, collection);
    return collection;
  } catch {
    return null;
  }
}

export async function renameCollection(id: string, name: string): Promise<boolean> {
  const clean = name.trim();
  if (!clean) return false;
  try {
    const db = await getDB();
    const existing = (await db.get(STORE_COLLECTIONS, id)) as Collection | undefined;
    if (!existing) return false;
    await db.put(STORE_COLLECTIONS, { ...existing, name: clean, updatedAt: Date.now() });
    return true;
  } catch {
    return false;
  }
}

/** Delete a collection and its memberships. Favorites are left untouched. */
export async function deleteCollection(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    const tx = db.transaction([STORE_COLLECTIONS, STORE_COLLECTION_ITEMS], 'readwrite');
    const keys = (await tx
      .objectStore(STORE_COLLECTION_ITEMS)
      .index(IDX_BY_COLLECTION)
      .getAllKeys(id)) as Array<[string, string]>;
    await Promise.all(keys.map((k) => tx.objectStore(STORE_COLLECTION_ITEMS).delete(k)));
    await tx.objectStore(STORE_COLLECTIONS).delete(id);
    await tx.done;
    return true;
  } catch {
    return false;
  }
}

async function touch(id: string): Promise<void> {
  try {
    const db = await getDB();
    const existing = (await db.get(STORE_COLLECTIONS, id)) as Collection | undefined;
    if (existing) await db.put(STORE_COLLECTIONS, { ...existing, updatedAt: Date.now() });
  } catch {
    /* ignore */
  }
}

/** Artwork ids in a collection, most recently added first. */
export async function getCollectionItemIds(collectionId: string): Promise<string[]> {
  try {
    const items = (await (await getDB())
      .getAllFromIndex(STORE_COLLECTION_ITEMS, IDX_BY_COLLECTION, collectionId)) as Item[];
    return items
      .filter((i) => i && typeof i.artworkId === 'string')
      .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
      .map((i) => i.artworkId);
  } catch {
    return [];
  }
}

/** The ids of every collection an artwork currently belongs to. */
export async function getCollectionsForArtwork(artworkId: string): Promise<string[]> {
  try {
    const items = (await (await getDB())
      .getAllFromIndex(STORE_COLLECTION_ITEMS, IDX_BY_ARTWORK, artworkId)) as Item[];
    return items.map((i) => i.collectionId);
  } catch {
    return [];
  }
}

/** Add an artwork to a collection (also saves it to Favorites). */
export async function addToCollection(collectionId: string, artworkId: string): Promise<boolean> {
  try {
    await (await getDB()).put(STORE_COLLECTION_ITEMS, {
      collectionId,
      artworkId,
      addedAt: Date.now(),
    });
    await touch(collectionId);
    await addFavorite(artworkId); // keep the library the superset of all collections
    return true;
  } catch {
    return false;
  }
}

/** Remove an artwork from a collection. Favorites are left untouched. */
export async function removeFromCollection(collectionId: string, artworkId: string): Promise<boolean> {
  try {
    await (await getDB()).delete(STORE_COLLECTION_ITEMS, [collectionId, artworkId]);
    await touch(collectionId);
    return true;
  } catch {
    return false;
  }
}

/** Toggle membership; returns the new state (true = now in the collection). */
export async function toggleInCollection(collectionId: string, artworkId: string): Promise<boolean> {
  try {
    const exists = await (await getDB()).get(STORE_COLLECTION_ITEMS, [collectionId, artworkId]);
    if (exists) {
      await removeFromCollection(collectionId, artworkId);
      return false;
    }
    await addToCollection(collectionId, artworkId);
    return true;
  } catch {
    return false;
  }
}

/** A map of collectionId → item count, for the library view. */
export async function getCollectionCounts(): Promise<Record<string, number>> {
  try {
    const items = (await (await getDB()).getAll(STORE_COLLECTION_ITEMS)) as Item[];
    const counts: Record<string, number> = {};
    for (const i of items) counts[i.collectionId] = (counts[i.collectionId] ?? 0) + 1;
    return counts;
  } catch {
    return {};
  }
}
