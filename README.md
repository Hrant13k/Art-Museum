# Art Museum

A calm, mobile-first **Progressive Web App** — a pocket museum that replaces mindless
scrolling with meaningful discovery. Open it and find a remarkable artwork in seconds,
swipe between masterpieces like a daily ritual, and explore the world's great collections.

Built to feel like a native iOS app: minimal, editorial, artwork-first. It runs entirely
from this repository — no backend, no database server, no cloud dependency.

| Today | Artwork | Explore |
| --- | --- | --- |
| Daily artwork, like opening a museum guide | Swipe between works, expandable notes | Browse by movement, culture, medium |

---

## Highlights

- **Daily artwork** on the home screen, rotating once per day.
- **DailyArt-style swiping** between artworks with smooth transitions (swipe, arrow keys, or buttons).
- **Explore** by category: Renaissance, Baroque, Impressionism, Japanese Art, Armenian Art,
  Sculpture, Photography, and more.
- **Fast local search** by title, artist, museum, movement, and period.
- **Favorites** saved locally (IndexedDB) — no account, works offline.
- **Artist and museum pages** with biographies, related artists, and featured works.
- **Full offline support** via a service worker after first load.
- **Installable PWA** with app icons, splash behavior, and iOS safe-area handling.
- **Accessible**: keyboard navigation, screen-reader labels, dynamic text sizing, reduced-motion support.

## Tech stack

Next.js (App Router, static export) · TypeScript · Tailwind CSS · Framer Motion ·
IndexedDB · Fuse.js · a local JSON database · a hand-written service worker.

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

The repository ships with a curated seed collection in [`data/`](data/), so the app works
immediately with no extra steps.

### Production build (static, self-contained)

```bash
npm run build        # outputs a fully static site to ./out
npx serve out        # preview the production build (or any static server)
```

The `out/` directory is a complete static site. Host it anywhere (or open it from any
static file server) — there is nothing else to run. The service worker only activates in
the production build, so test offline behavior against `out/`, not `npm run dev`.

---

## Data pipeline

The collection is built in two clearly separated steps. Both write to [`data/`](data/),
which is the single source of truth imported by the app at build time.

```
scripts/
├── collect.ts        # 1. fetch + normalize + de-duplicate + verify images
├── enrich.ts         # 2. add rich, factual content via the Claude API
├── gen-icons.ts      # regenerate PWA icons from public/icons/icon.svg
├── config.ts         # the curation plan (queries, movements, target size)
├── sources/          # one adapter per museum API (Met, AIC, Cleveland)
└── lib/              # fetch/retry, slugify, year parsing, de-dup helpers
```

### 1. Collect

```bash
npm run data:collect
```

Fetches artworks from public museum APIs, normalizes them to a single shape, de-duplicates
across sources, and **verifies every image loads cross-origin** before storing it — so no
broken images ever reach the UI. Produces `data/artworks.json`, `data/artists.json`, and
`data/museums.json`.

Sources: the **Metropolitan Museum of Art** and **Cleveland Museum of Art** open-access
APIs (no key required). The Art Institute of Chicago adapter is included for reference but
disabled by default, because its images sit behind Cloudflare hotlink protection.

**Scaling to 1,000+ artworks:** raise `TARGET_SIZE` and add/extend entries in
[`scripts/config.ts`](scripts/config.ts), then re-run `npm run data:collect`. The script is
polite to the APIs (rate-limit backoff) and de-duplicates automatically.

### 2. Enrich

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run data:enrich
```

Uses the Claude API to generate concise, factual, engaging content for each artwork —
`overview`, `creationStory`, `whoIsDepicted`, `historicalContext`, and `interestingFacts`,
plus artist biographies. Writing is grounded and non-sensational; when information is
genuinely unknown, the text says so.

- **Resumable & incremental** — re-running only processes items not yet enriched, saving
  progress as it goes.
- **Graceful fallback** — without `ANTHROPIC_API_KEY`, enrichment is skipped and the
  metadata-derived fallback content from the collect step remains in place. The UI clearly
  marks works whose extended details are limited.
- Override the model with `ENRICH_MODEL` (defaults to a fast, low-cost Claude model).

Run both steps together:

```bash
npm run data:build   # collect, then enrich
```

---

## Architecture

Clean separation of concerns:

```
data/                       generated JSON database (committed)
scripts/                    data collection · enrichment · icon generation
src/
├── types/                  shared domain types (Artwork, Artist, Museum)
├── lib/
│   ├── db.ts               typed access to the local database
│   ├── search.ts           local Fuse.js search index
│   ├── favorites.ts        IndexedDB persistence
│   ├── useFavorites.ts     reactive favorites hook
│   ├── categories.ts       Explore categories
│   └── daily.ts            deterministic artwork-of-the-day
├── components/             UI building blocks (viewer, cards, nav, sections)
└── app/                    routes (home, artwork, explore, search, favorites, artist, museum)
public/
├── manifest.webmanifest    PWA manifest
├── sw.js                   service worker (offline caching)
└── icons/                  app icons (generated from icon.svg)
```

The entire collection ships inside the app bundle, so browsing, search, favorites, and all
detail pages work fully offline by construction — the service worker only needs to cache the
app shell, static chunks, and (lazily) the museum images you view.

## Data shape

```ts
Artwork {
  title, artist, year, museum, museumLocation, image, movement, medium,
  overview, creationStory, whoIsDepicted, historicalContext, interestingFacts,
  sourceLinks, /* + ids, tags, enrichmentStatus, thumbnail, … */
}
```

## Accessibility & performance

- Keyboard navigation (arrow keys move between artworks), `:focus-visible` styling, ARIA
  labels and `aria-pressed`/`aria-expanded` on interactive controls.
- Respects `prefers-reduced-motion`; supports dynamic text sizing and iOS safe areas.
- Lazy-loaded, fade-in images; small JS bundles; static prerendering of every page.

## Credits

Artwork images and metadata courtesy of the open-access programs of
[The Metropolitan Museum of Art](https://www.metmuseum.org/) and the
[Cleveland Museum of Art](https://www.clevelandart.org/). Please respect each museum's
terms of use.
