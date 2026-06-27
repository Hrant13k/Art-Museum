// Lazy loader for the heavy, detail-only artwork fields. The viewer shows the
// light data (image, title, artist, overview) instantly, then fills in the
// expandable detail sections from here. The file is fetched once, memoised for
// the session, and cached by the service worker so it works offline thereafter.
import type { ArtworkDetail } from '@/types/artwork';

let cache: Promise<Record<string, ArtworkDetail>> | null = null;

/** Fetch (once) and return the full id → detail map. */
export function loadDetails(): Promise<Record<string, ArtworkDetail>> {
  if (!cache) {
    cache = fetch('/data/details.json')
      .then((res) => {
        if (!res.ok) throw new Error(`details.json ${res.status}`);
        return res.json() as Promise<Record<string, ArtworkDetail>>;
      })
      .catch((err) => {
        cache = null; // allow a retry on the next call
        throw err;
      });
  }
  return cache;
}

/** Warm the cache ahead of time (e.g. when the viewer mounts). */
export function prefetchDetails(): void {
  loadDetails().catch(() => {});
}
