// Local database access for the client. We import the *light* artwork index —
// the fields every page needs to browse, search and swipe — so first load stays
// small. The heavy, detail-only prose (creation story, facts, source links, …)
// lives in public/data/details.json and is loaded on demand by the viewer
// (see lib/details.ts). Artists and museums are small enough to bundle whole.
import artworksData from '../../data/artworks.light.json';
import artistsData from '../../data/artists.json';
import museumsData from '../../data/museums.json';
import type { Artwork, Artist, Museum, Category } from '@/types/artwork';

export const artworks = artworksData as unknown as Artwork[];
export const artists = artistsData as unknown as Artist[];
export const museums = museumsData as unknown as Museum[];

const artworkById = new Map(artworks.map((a) => [a.id, a]));
const artistById = new Map(artists.map((a) => [a.id, a]));
const museumById = new Map(museums.map((m) => [m.id, m]));

export function getArtwork(id: string): Artwork | undefined {
  return artworkById.get(id);
}
export function getArtist(id: string): Artist | undefined {
  return artistById.get(id);
}
export function getMuseum(id: string): Museum | undefined {
  return museumById.get(id);
}

export function getArtworksByIds(ids: string[]): Artwork[] {
  return ids.map((id) => artworkById.get(id)).filter((a): a is Artwork => Boolean(a));
}

/** Deterministic ordering used as the canonical sequence for swipe navigation. */
export function orderedArtworks(): Artwork[] {
  return artworks;
}

export function artworkMatchesCategory(artwork: Artwork, category: Category): boolean {
  if (category.id === 'all' || category.id === 'random') return true;
  const haystack = new Set([
    ...artwork.tags,
    artwork.movement.toLowerCase().replace(/\s+/g, '-'),
  ]);
  return category.match.some((m) => haystack.has(m));
}

export function artworksInCategory(category: Category): Artwork[] {
  if (category.id === 'all' || category.id === 'random') return artworks;
  return artworks.filter((a) => artworkMatchesCategory(a, category));
}
