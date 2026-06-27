import Fuse from 'fuse.js';
import type { Artwork, Artist } from '@/types/artwork';
import { artworks, artists } from './db';

// A single local Fuse index, built lazily on first use (client-side).
let fuse: Fuse<Artwork> | null = null;
let artistFuse: Fuse<Artist> | null = null;

function index(): Fuse<Artwork> {
  if (!fuse) {
    fuse = new Fuse(artworks, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'artist', weight: 0.3 },
        { name: 'movement', weight: 0.12 },
        { name: 'museum', weight: 0.1 },
        { name: 'medium', weight: 0.05 },
        { name: 'year', weight: 0.03 },
      ],
      threshold: 0.38,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }
  return fuse;
}

export function searchArtworks(query: string, limit = 60): Artwork[] {
  const q = query.trim();
  if (!q) return [];
  return index()
    .search(q, { limit })
    .map((r) => r.item);
}

function artistIndex(): Fuse<Artist> {
  if (!artistFuse) {
    artistFuse = new Fuse(artists, {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'nationality', weight: 0.15 },
        { name: 'movement', weight: 0.15 },
      ],
      threshold: 0.34,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }
  return artistFuse;
}

export function searchArtists(query: string, limit = 6): Artist[] {
  const q = query.trim();
  if (!q) return [];
  return artistIndex()
    .search(q, { limit })
    .map((r) => r.item)
    .filter((a) => a.name !== 'Unknown artist');
}
