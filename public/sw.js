/* Art Museum service worker — offline support via runtime caching.
 *
 * The entire artwork collection ships inside the app's JavaScript bundle, so
 * caching the app shell + static chunks is enough to make browsing, search,
 * favorites, artist and museum pages all work offline. Museum images are cached
 * separately as they are viewed.
 */
const VERSION = 'v1';
const SHELL_CACHE = `am-shell-${VERSION}`;
const ASSET_CACHE = `am-assets-${VERSION}`;
const IMAGE_CACHE = `am-images-${VERSION}`;
const IMAGE_MAX = 300;

const PRECACHE = ['/', '/explore/', '/search/', '/favorites/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Best-effort precache: never let one missing URL fail the install.
      Promise.allSettled(PRECACHE.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  for (const key of keys.slice(0, keys.length - max)) await cache.delete(key);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // 1) Page navigations — network-first, fall back to cache, then to home.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          return (
            (await caches.match(request)) ||
            (await caches.match('/')) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // 2) Same-origin static assets (_next chunks, icons) — stale-while-revalidate.
  if (isSameOrigin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
    return;
  }

  // 3) Cross-origin museum images — cache-first (they are immutable).
  if (request.destination === 'image') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok || res.type === 'opaque') {
            cache.put(request, res.clone());
            trimCache(IMAGE_CACHE, IMAGE_MAX);
          }
          return res;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
  }
});
