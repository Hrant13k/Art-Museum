# Production-Readiness Review — Art Museum (Alpha)

_Reviewed at the alpha stage, before adding new features. Dataset: 107 artworks, 49 artists,
3 museums. Verified against a production build in a real headless browser._

## Issues found & fixes applied

### Reliability
| # | Issue | Severity | Status |
| --- | --- | --- | --- |
| 1 | `addFavorite`/`removeFavorite`/`toggleFavorite` didn't catch errors — a failing IndexedDB (Safari Private Mode, quota, eviction) would throw unhandled from the click handler. | High | ✅ Fixed — all mutations are now `try/catch` and never throw; UI reads back actual state so it stays correct. |
| 2 | `getFavoriteIds` didn't validate row shape — a corrupted/legacy record could break sorting. | Medium | ✅ Fixed — filters to well-formed `{id, addedAt}` rows. |
| 3 | No crash boundary — a single render error would white-screen the whole app. | High | ✅ Fixed — added `error.tsx` (route) and `global-error.tsx` (root layout). |
| 4 | `HomeDaily` threw if the collection was empty (unhandled in effect). | Medium | ✅ Fixed — graceful "collection is empty" state. |

### PWA
| # | Issue | Severity | Status |
| --- | --- | --- | --- |
| 5 | **Manifest `theme_color`/`background_color` were still the old light value `#f6f4ef`** after the dark redesign → white splash-screen flash on launch + wrong status-bar tint. | High | ✅ Fixed → `#100e0c`. |
| 6 | Manifest missing `id`, `lang`, `dir`. | Low | ✅ Fixed. |
| 7 | No deployment caching headers — risk of serving a stale service worker; static assets not marked immutable. | Medium | ✅ Fixed via `vercel.json`. |

### Performance
| # | Issue | Severity | Status |
| --- | --- | --- | --- |
| 8 | The full `artworks.json` (204 KB at 107 works) is imported into the client bundle. | Med (at scale) | ⚠️ Flagged — fine for alpha; see Remaining Concerns for the fix before scaling to 1,000. |

### Data integrity
- Broken images already degrade to an "Image unavailable" placeholder. ✅
- Corrupted IndexedDB rows are now filtered out — cannot crash the app. ✅
- Empty query / missing fields handled (`Date unknown`, `Medium unknown`, hidden empty sections). ✅
- Search is pure client-side over in-memory data — cannot be broken by storage state. ✅

## Verified in a real browser (production build, offline + persistence)
All 9 automated checks passed:
- ✅ Service worker registers **and controls the page** (`clients.claim`).
- ✅ Favorite toggles on; **survives page refresh**; **persists in IndexedDB**; appears on the Saved tab.
- ✅ **Home, Explore (108 cards), and Search all load fully OFFLINE.**

## Deployment prep
- `vercel.json`: `sw.js` → `must-revalidate` (+ `Service-Worker-Allowed: /`); manifest revalidate;
  `/_next/static/*` → 1-year immutable; icons cached a week.
- `next.config.mjs` static export confirmed compatible with Vercel; no env vars needed to run.
- `DEPLOY_TO_VERCEL.md` written for first-time users.

## Remaining concerns
1. **Data-in-bundle scaling ceiling.** At ~1,000 works the imported JSON would be ~2 MB of First
   Load JS. *Before scaling up:* serve the dataset from `public/data/*.json` and fetch at runtime
   (service-worker cached), or split per route. ~Half a day of work; not needed for a 107-work alpha.
2. **Framer-Motion `initial: opacity 0`** renders content hidden in the pre-hydration HTML, so
   there's a brief blank on very slow connections / with JS disabled. Acceptable for a JS-required
   PWA; could add a no-JS reveal fallback.
3. **iOS storage eviction (ITP):** IndexedDB favorites may be cleared after ~7 days of no use, and
   aren't persisted in Private Mode. Platform limitation — a future "export favorites" or optional
   sync would address it.
4. **No analytics / error reporting** yet. `error.tsx` has a hook point; wire Vercel Analytics or
   Sentry when ready.
5. **Content depth:** rich prose sections are still metadata/Wikidata fallbacks (no `ANTHROPIC_API_KEY`
   run). A quality matter, not a reliability one.

## Deployment readiness score: **8 / 10**
Verified offline support, reliable favorites persistence, installable PWA, crash boundaries,
correct caching headers, and a clean build. Held back from 9–10 by the data-bundling scale
ceiling, absence of monitoring/analytics, and shallow text content until enrichment is run.

## Would I deploy this for a public alpha? **Yes.**
At ~107 works the experience is solid and its failure modes are graceful (no crashes, no data
loss, works offline). Before a wider/v1 launch: move data out of the bundle for scale, wire
analytics + error reporting, and run Claude enrichment for richer writing.
