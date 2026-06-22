import Fuse from 'fuse.js';
import type { Artwork } from '@/types/artwork';
import { artworks } from './db';

// A single local Fuse index, built lazily on first use (client-side).
let fuse: Fuse<Artwork> | null = null;

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
