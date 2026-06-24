# Art Museum — Data Source Audit, Recommendations & Pipeline Plan

_Last reviewed: June 2026. This is a planning document — no large-scale collection has been run yet._

## Purpose & constraints

We want **the most complete and accurate local art database possible**, while staying:

1. **Free** — no paid data/API tiers.
2. **Legal** — every artwork, image, and text must be used within its license.
3. **Authoritative-first** — prefer museums, Wikidata, and academic sources over user-generated content.
4. **Self-contained** — after collection, the app must run with **no external dependency** (offline-first). Data is normalized and committed to the repo.

The third and fourth constraints are the ones that actually decide which sources we can use, because we **store and re-serve** images and text rather than just linking to them. See [Licensing analysis](#licensing-analysis-the-deciding-factor).

---

## TL;DR — recommendations

| Role | Sources |
| --- | --- |
| **Primary (artworks + images)** | The Met · Cleveland Museum of Art · Art Institute of Chicago |
| **Primary (linking + facts)** | **Wikidata** (the backbone that ties everything together) |
| **Image fallback** | Wikimedia Commons (per-file license check) |
| **Text enrichment input** | Wikipedia extracts + Wikidata facts → rewritten by Claude (not stored verbatim) |
| **Artist authority** | Wikidata + Getty ULAN (names, dates, nationality) |
| **Add with a free key (Phase 1)** | Rijksmuseum · Smithsonian Open Access |
| **Add with a free key (optional)** | Europeana · Cooper Hewitt · Brooklyn Museum · Walters |
| **Excluded** | Harvard (license conflict) · Google Arts & Culture (no API) · WikiArt (UGC/murky) · Tate/MoMA (metadata only, no images) · Artsy/Bridgeman (commercial) |

---

## A. Sources usable IMMEDIATELY — no key, no action from you

These are already legally usable today. I can collect from them whenever you say go.

### 1. The Metropolitan Museum of Art ⭐ primary
- **Key:** none. **Rate limit:** 80 requests/second (we self-throttle; bursts can still return 403, so we back off).
- **Artwork data:** title, artist display name + nationality + begin/end dates, date, medium, dimensions, classification, department, geography, **Wikidata + ULAN URLs**, tags.
- **Artist data:** embedded per object (no dedicated artist endpoint).
- **Images:** high-res public-domain JPEGs (`primaryImage`) + a web-large variant; **hotlink-friendly** (verified). `isPublicDomain` flag is reliable.
- **License:** CC0 for the open-access metadata and public-domain images.
- **Reliability:** very high (large institution, stable since 2018).

### 2. Cleveland Museum of Art ⭐ primary
- **Key:** none. **Rate limit:** not published (be polite).
- **Artwork data:** 64k+ records; title, creation dates, **creator records with biographies**, technique, dimensions, provenance, exhibition history, citations, `culture`.
- **Images:** CC0 works expose Web (900px), Print (3400px), and Full (TIFF); served from a CDN, **hotlink-friendly** (verified).
- **License:** CC0 for the dataset; images CC0 where `share_license_status = CC0`.
- **Reliability:** high. Also offers full **JSON/CSV bulk dumps on GitHub** (great for offline collection without hammering the API).

### 3. Art Institute of Chicago ⭐ primary (reinstate)
- **Key:** none. **Rate limit:** 60 requests/minute per IP (anonymous).
- **Artwork data:** excellent — `artist_display`, `date_display`, `medium_display`, `place_of_origin`, `style_titles` (movements!), `classification_title`, `department_title`.
- **Images:** IIIF Image API. AIC's docs say hotlinking + CORS are supported.
  - ⚠️ **Verified the hard way:** a server-side `curl` *and* a real headless browser load (different origin) both get a **Cloudflare block** (image `naturalWidth = 0`) — likely datacenter-IP sensitive. We cannot rely on hotlinking AIC images. **Resolution: use AIC for its superior metadata (movements/styles) and source the image from Wikimedia Commons via the work's Wikidata QID.** This is exactly what the Commons image-fallback path is for; Met + Cleveland remain the hotlink-reliable image backbone.
- **License:** most data CC0; the `description` field is CC-BY 4.0 (attribute if stored); public-domain images free to use.
- **Reliability:** high.

### 4. Wikidata ⭐ primary backbone (no images, but the glue)
- **Key:** none. **Access:** SPARQL (`query.wikidata.org`), REST API, Linked-Data URIs, full dumps. **Limits:** etiquette-based — descriptive User-Agent required, ~60s query timeout, honor HTTP 429.
- **Artwork data:** `creator (P170)`, `inception (P571)`, `material used (P186)`, `collection (P195)`, `movement (P135)`, `genre (P136)`, `depicts (P180)`, `image (P18 → Commons file)`, `location`, plus the museum's own inventory number for cross-matching.
- **Artist data:** dates of birth/death, nationality, movement, occupation, ULAN/VIAF ids, image.
- **License:** **CC0** — no attribution required. Safe to store freely.
- **Role:** the **deduplication key and fact source.** A Wikidata QID lets us merge "the same painting" across the Met, AIC, Rijksmuseum, etc., and fill missing fields (movement, depicted subject, inception) authoritatively.

### 5. Wikimedia Commons — image fallback
- **Key:** none (MediaWiki Action API; descriptive User-Agent expected).
- **Images:** the actual image files behind Wikidata `P18`. Resolutions up to original.
- **License:** **varies per file** (CC0 / PD / CC-BY / CC-BY-SA / GFDL). We must query each file's `imageinfo → extmetadata` for `LicenseShortName` + `Artist`/`Attribution` and **store that per image.**
- **Role:** fill images for public-domain works a museum API lacks. Filter to CC0/PD/CC-BY(-SA); record attribution.

### 6. Wikipedia — enrichment input only (not stored verbatim)
- **Key:** none. REST summary API: `…/api/rest_v1/page/summary/{title}`.
- **License:** **CC-BY-SA 4.0 (copyleft).** Storing prose verbatim would impose share-alike on our text.
- **Role:** feed extracts (plus Wikidata facts) **into Claude** as source material; Claude writes original summaries. We keep a Wikipedia **source link** for attribution. Facts themselves aren't copyrightable.

### 7. National Gallery of Art — bulk CC0 metadata
- **Key:** none. Bulk **CSV** (not an API), 130k+ artworks + artists, includes Wikidata ids.
- **Images:** **not in the dataset** — NGA publishes open-access images via Wikimedia Commons. So: use NGA for metadata/artist links, pull images from Commons.
- **License:** CC0 (metadata). Reliability high.

### 8. Smithsonian Open Access — bulk dumps (no key path)
- The **API** needs a free key (see Section B), but **CC0 bulk metadata dumps** are on the AWS Registry of Open Data with **no key**. 11M+ records across 24 units → filter to art units (American Art Museum, Freer/Sackler, Hirshhorn, National Portrait Gallery, Cooper Hewitt).
- **License:** CC0. Images available for CC0 items.

---

## B. Sources requiring a free key / registration — and exactly what you must do

### 1. Rijksmuseum ⭐ recommended Phase 1 (Dutch Golden Age — Rembrandt, Vermeer, Hals)
- **What I need from you:**
  1. Create a free Rijksstudio account at <https://www.rijksmuseum.nl/en/rijksstudio>.
  2. Go to account **Settings → Advanced settings (API)** and request an **API key**.
  3. Give me the key (or set it as `RIJKSMUSEUM_API_KEY`).
- **Rate limit:** historically **~10,000 requests/day** per key _(verify in the portal — Rijksmuseum revised its API access in 2024–25)_.
- **Artwork/artist data:** rich; strong on Dutch masters. **Images:** public-domain works downloadable at very high resolution (IIIF/tiles).
- **License:** public-domain images are free to reuse; metadata reusable. Reliability high.

### 2. Smithsonian Open Access API
- **What I need from you:** a free **api.data.gov** key at <https://api.data.gov/signup/> (instant).
- **Rate limit:** api.data.gov default **1,000 requests/hour**.
- **License:** CC0. _(Or skip the key entirely and use the bulk dumps in Section A.8.)_

### 3. Europeana — breadth across European institutions
- **What I need from you:** a free Europeana account → request a **Personal API key** (since May 2025, in the account section of europeana.eu). Get one at <https://pro.europeana.eu/page/get-api>.
- **License:** **per-item, mixed.** We must filter on the `rights` field to CC0 / public-domain / CC-BY and **record attribution.** Aggregator → metadata quality varies; treat as breadth/fallback, not primary.

### 4. Getty ULAN — artist authority (optional but valuable)
- Union List of Artist Names as **Linked Open Data** (also SPARQL). Authoritative names, birth/death, nationality, relationships.
- **License:** **ODC-BY** (attribution). No key for the LOD/SPARQL endpoints.
- **Role:** normalize/disambiguate artists (the Met and Wikidata already carry ULAN ids, so this slots in cleanly).

### 5. Other keyed museum APIs (optional, smaller)
| Source | Key | Notes |
| --- | --- | --- |
| Cooper Hewitt | free key | design/decorative arts; CC0 metadata |
| Brooklyn Museum | free key | broad collection |
| Walters Art Museum | free key | CC0 images |
| DPLA | free key (request) | aggregator; **rights vary** — filter |

---

## C. Excluded sources (and why)

| Source | Reason |
| --- | --- |
| **Harvard Art Museums** | Key required **and** terms forbid local image hosting + caching metadata beyond two weeks, and restrict to non-commercial. **Directly conflicts** with our offline-local-storage goal. Excluded. |
| **Google Arts & Culture** | No public API; scraping is against ToS. Excluded. |
| **WikiArt** | Only unofficial APIs; user-generated; image licensing murky/fair-use. Fails "authoritative over UGC." Excluded. |
| **Tate, MoMA** | Generous **metadata** CSVs (CC0), but **no open images** (works in copyright/rights-restricted). Metadata-only — low value for an image-first app. Optional, low priority. |
| **Artsy / Bridgeman / Art UK** | Commercial / restrictive licensing or no free image reuse. Excluded. |

---

## Licensing analysis (the deciding factor)

Because we **download and re-serve** content for offline use, "is it free to *view*?" is not enough — it must be free to **store and redistribute**.

| License | Can we store & serve the image? | Can we store text? | Obligation |
| --- | --- | --- | --- |
| **CC0 / Public Domain** | ✅ yes | ✅ yes | none (attribution courteous) |
| **CC-BY** | ✅ yes | ✅ yes | **must attribute** (store creator + source) |
| **CC-BY-SA** | ✅ yes (image) | ⚠️ avoid storing prose verbatim | attribute **+ share-alike** |
| **Rights-restricted / no-cache (Harvard)** | ❌ no | ❌ no | excluded |

**Practical policy for the dataset:**
- **Images:** only ingest **CC0 / public-domain** (and CC-BY with stored attribution). This covers virtually all pre-1928 masterpieces — exactly our focus.
- **Structured facts:** take freely from **Wikidata (CC0)** and museum CC0 metadata.
- **Prose:** **never store Wikipedia text verbatim.** Use it only as Claude input; store Claude's original wording + a Wikipedia source link.
- **Every record carries `license` + `attribution` + `sourceLinks`** so provenance is auditable and we can prove compliance.

---

## Recommended pipeline architecture (multi-source merge + enrichment)

### Schema additions (extend the current `Artwork`/`Artist` types)
- `externalIds: { wikidata?, ulan?, met?, aic?, ... }` — for cross-source matching.
- `image: { url, localPath?, width, license, attribution, source }` — per-image provenance.
- `provenance: Record<field, sourceId>` — which source supplied each field (audit trail).
- `license` + `attribution` at the record level.
- Keep `sourceLinks` (museum page, Wikipedia, Wikidata).

### Stages (each isolated, resumable, cached to disk)

```
1. COLLECT      Pull candidate records from each enabled source adapter
                (Met, Cleveland, AIC[, Rijksmuseum, Smithsonian]).
                    ↓
2. RESOLVE      Attach a Wikidata QID to each candidate
   IDENTITY     (via the museum's Wikidata link, or match on
                title+artist+date). QID becomes the dedupe key.
                    ↓
3. MERGE        Group by QID (fallback: normalized title+artist).
                Fill fields by SOURCE PRIORITY; record provenance.
                    ↓
4. ENRICH       a) Wikidata facts (movement, depicts, inception) — CC0.
                b) Wikipedia extract + facts → Claude → original prose
                   for overview/creationStory/etc. (with source link).
                c) Getty ULAN / Wikidata → authoritative artist bios.
                    ↓
5. IMAGES       Choose best CC0/PD image (museum first, Commons fallback).
                Verify it loads; optionally DOWNLOAD a web-sized copy
                into the repo for true offline independence.
                    ↓
6. VALIDATE     Drop records with no usable image or license; flag
                low-confidence enrichment; de-dup final set.
                    ↓
7. WRITE        Normalize → data/artworks.json, artists.json,
                museums.json, + image-license manifest.
```

### Conflict resolution (source priority, highest → lowest)
For factual fields: **museum metadata → Wikidata → Europeana**.
For movement/style: **AIC `style_titles` → Wikidata `P135` → our curation tag**.
For images: **highest-res CC0 museum image → Commons CC0/PD → museum web-large**.
Provenance is recorded per field so any value is traceable.

### Deduplication
- **Primary key: Wikidata QID** (resolves "same work, different museum photo/record").
- **Fallback:** `slug(title) + slug(artist) + year bucket`.
- Already-seen QIDs/slugs are skipped across all sources.

### Offline image storage — a decision for you
The app currently **hotlinks** museum CDNs + caches via the service worker (light repo, depends on CDNs staying up). For **true independence** ("function with no external sources"), we should **download web-sized images into the repo**:

- ~1,000 works × ~150 KB (web-sized) ≈ **~150 MB**. Options:
  - **(a) Commit downscaled images** (e.g. ≤1200px) under `public/artwork-images/` — simplest, but grows the repo.
  - **(b) Git LFS** for the image directory — keeps the main repo lean.
  - **(c) Hybrid (current):** store URLs + SW runtime cache; not truly independent if a CDN dies.
- **Recommendation:** **(a)** with downscaled CC0/PD images for genuine offline independence, sized for mobile. I'll need your go-ahead on the repo-size tradeoff.

---

## Phased rollout

| Phase | Needs from you | Result |
| --- | --- | --- |
| **0 — no keys** | nothing | Met + Cleveland + AIC collection, deduped via Wikidata, enriched from Wikidata/Wikipedia(+Claude). Re-test AIC images in-browser. |
| **1 — free keys** | Rijksmuseum key, Smithsonian/api.data.gov key | Add Dutch masters + Smithsonian breadth. |
| **2 — breadth** | Europeana key (optional), Getty ULAN (no key) | European breadth + authoritative artist data. |
| **Enrichment** | `ANTHROPIC_API_KEY` (paid) | Rich, original museum-guide text for every work. |
| **Scale** | go-ahead + image-storage decision | Scale to 1,000+ and (optionally) download images locally. |

---

## What I need from you — checklist

- [ ] **Image storage:** commit downscaled local images for true offline (recommended), or keep hotlink+SW cache?
- [ ] **Phase 1 keys (free):** Rijksmuseum API key · api.data.gov key (Smithsonian).
- [ ] **Optional keys (free):** Europeana.
- [ ] **Enrichment:** `ANTHROPIC_API_KEY` (paid) for rich text — or stay with museum-metadata fallback.
- [ ] **Scope:** target collection size (e.g., 1,000) and movement/culture balance.

Nothing above blocks **Phase 0**, which needs no keys. Say the word and I'll build the multi-source pipeline and run Phase 0.

---

## Sources consulted

- [The Met Collection API](https://metmuseum.github.io/)
- [Art Institute of Chicago API docs](https://api.artic.edu/docs/)
- [Cleveland Museum of Art Open Access API](https://openaccess-api.clevelandart.org/)
- [Harvard Art Museums API docs](https://github.com/harvardartmuseums/api-docs)
- [Wikidata: Data access](https://www.wikidata.org/wiki/Wikidata:Data_access)
- [Wikimedia Commons: Reusing content](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)
- [Europeana APIs / Get an API key](https://pro.europeana.eu/page/get-api)
- [Smithsonian Open Access](https://github.com/Smithsonian/OpenAccess)
- [National Gallery of Art open data](https://github.com/NationalGalleryOfArt/opendata)
- [Rijksmuseum API (Postman/community docs)](https://www.postman.com/opamcurators/open-access-museums/documentation/g0pckq6/the-rijksmuseum-api)
- Getty Vocabularies (ULAN) as Linked Open Data — <http://vocab.getty.edu/>
