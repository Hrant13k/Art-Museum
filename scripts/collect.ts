// Multi-source data collection.
//
//   npm run data:collect
//
// Pipeline:
//   1. COLLECT   pull candidates from museum adapters (Met, AIC, Cleveland)
//   2. RESOLVE   attach a Wikidata QID (Met provides it; others via accession lookup)
//   3. ENRICH    fold in CC0 Wikidata facts (movement, depicts, inception, artist)
//   4. IMAGES    pick a usable image — museum first, Wikimedia Commons fallback —
//                verify it loads, and record its license + attribution
//   5. WRITE     normalize → data/{artworks,artists,museums}.json
//
// Rich prose (overview / creation story / …) is a separate, optional step:
//   npm run data:enrich   (uses ANTHROPIC_API_KEY)
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PLANS, TARGET_SIZE } from './config.js';
import { fetchMetObjects, searchMet } from './sources/met.js';
import { searchAic } from './sources/aic.js';
import { searchCma } from './sources/cma.js';
import { enrichFromWikidata, type WdArtistFacts } from './sources/wikidata.js';
import { findArtworkQid, MUSEUM_QID } from './lib/wikidata.js';
import { resolveCommonsImage } from './sources/commons.js';
import { slugify, cleanYear, parseYearValue, uniqueBy, sleep } from './lib/util.js';
import type { NormalizedRaw } from './lib/normalized.js';
import type { Artwork, Artist, Museum } from '../src/types/artwork.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

// Sources whose images are NOT reliably hotlinkable cross-origin → force Commons.
const NO_HOTLINK = new Set(['aic']);

const IMAGE_LICENSE: Record<string, string> = { met: 'Public Domain', cma: 'CC0' };

// — metadata-only fallback content (upgraded later by enrichment) —
function metadataFallback(raw: NormalizedRaw, movement: string, depicts: string[]) {
  const bits = [raw.medium, raw.culture].filter(Boolean);
  const detail = bits.length ? ` ${bits.join(', ')}.` : '';
  return {
    overview:
      `${raw.title} by ${raw.artist}${raw.yearDisplay ? `, ${raw.yearDisplay}` : ''}.${detail} ` +
      `Held by ${raw.museum}.`,
    creationStory: 'A detailed creation story is not yet available for this work.',
    whoIsDepicted: depicts.length
      ? `Depicts ${depicts.slice(0, 6).join(', ')}.`
      : 'Information about the subject is not yet available for this work.',
    historicalContext: movement ? `Associated with ${movement}.` : 'Historical context is not yet available.',
    interestingFacts: [] as string[],
  };
}

function buildTags(raw: NormalizedRaw, planTags: string[], movement: string, genre: string | null): string[] {
  const t = new Set<string>(planTags);
  t.add(slugify(movement));
  if (genre) t.add(slugify(genre));
  if (raw.classification) t.add(slugify(raw.classification));
  if (raw.department) t.add(slugify(raw.department));
  for (const s of raw.styles) t.add(slugify(s));
  const blob = (raw.classification + ' ' + raw.medium).toLowerCase();
  if (/sculpt|marble|bronze/.test(blob)) t.add('sculpture');
  if (/photo/.test(blob)) t.add('photography');
  if (/print|woodblock|etching|engraving/.test(blob)) t.add('print');
  if (/paint|oil|canvas|tempera/.test(blob)) t.add('painting');
  return [...t].filter(Boolean);
}

// — 1. COLLECT —
async function gather(): Promise<{ raw: NormalizedRaw; movement: string; tags: string[] }[]> {
  const results: { raw: NormalizedRaw; movement: string; tags: string[] }[] = [];
  const plans = process.env.MAX_PLANS ? PLANS.slice(0, Number(process.env.MAX_PLANS)) : PLANS;
  for (const plan of plans) {
    process.stdout.write(`• [${plan.source}] "${plan.query}" … `);
    let rows: NormalizedRaw[] = [];
    try {
      if (plan.source === 'met') rows = await searchMet(plan.query, plan.limit);
      else if (plan.source === 'aic') rows = await searchAic(plan.query, plan.limit);
      else if (plan.source === 'cma') rows = await searchCma(plan.query, plan.limit);
    } catch (err) {
      console.log(`failed (${(err as Error).message})`);
      continue;
    }
    console.log(`${rows.length} found`);
    for (const raw of rows) {
      const movement = raw.styles[0] || plan.movement;
      results.push({ raw, movement, tags: buildTags(raw, plan.tags, movement, null) });
    }
    await sleep(700);
  }
  return results;
}

// — 2/3. base records + Wikidata enrichment —
function baseArtwork(raw: NormalizedRaw, movement: string, tags: string[]): Artwork {
  const fallback = metadataFallback(raw, movement, []);
  return {
    id: `${raw.source}-${raw.sourceId}`,
    source: raw.source,
    sourceId: raw.sourceId,
    title: raw.title,
    artist: raw.artist,
    artistId: slugify(raw.artist),
    year: cleanYear(raw.yearDisplay),
    yearValue: parseYearValue(raw.yearDisplay),
    museum: raw.museum,
    museumId: slugify(raw.museum),
    museumLocation: raw.museumLocation,
    image: raw.image,
    thumbnail: raw.thumbnail,
    movement,
    medium: raw.medium || 'Medium unknown',
    culture: raw.culture,
    department: raw.department,
    tags,
    enrichmentStatus: 'metadata-fallback',
    sourceLinks: [{ label: `View at ${raw.museum}`, url: raw.sourceUrl }],
    externalIds: raw.qid ? { wikidata: raw.qid, [raw.source]: raw.sourceId } : { [raw.source]: raw.sourceId },
    provenance: { title: raw.source, artist: raw.source, movement: raw.styles[0] ? raw.source : 'curation' },
    ...fallback,
  };
}

interface EnrichResult {
  artwork: Artwork;
  raw: NormalizedRaw;
  commonsFile: string | null;
  artistFacts: WdArtistFacts | null;
}

async function resolveAndEnrich(
  candidates: { raw: NormalizedRaw; movement: string; tags: string[] }[],
): Promise<EnrichResult[]> {
  console.log(`\nResolving Wikidata identities & enriching ${candidates.length} works…`);
  const out: EnrichResult[] = [];
  let enriched = 0;

  for (const { raw, movement, tags } of candidates) {
    const art = baseArtwork(raw, movement, tags);
    let commonsFile: string | null = null;
    let artistFacts: WdArtistFacts | null = null;

    // 2. Resolve QID.
    let qid = raw.qid;
    if (!qid && raw.accession && MUSEUM_QID[raw.source]) {
      qid = await findArtworkQid(raw.accession, MUSEUM_QID[raw.source]);
      await sleep(250);
    }

    // 3. Enrich from Wikidata (CC0).
    if (qid) {
      const wd = await enrichFromWikidata(qid).catch(() => null);
      await sleep(200);
      if (wd) {
        enriched++;
        art.externalIds = { ...art.externalIds, wikidata: qid };
        if (wd.artwork.movement) {
          art.movement = wd.artwork.movement;
          art.provenance!.movement = 'wikidata';
          art.tags = [...new Set([...art.tags, slugify(wd.artwork.movement)])];
        }
        if (wd.artwork.genre) art.tags = [...new Set([...art.tags, slugify(wd.artwork.genre)])];
        if (wd.artwork.depicts.length) {
          art.depicts = wd.artwork.depicts;
          art.whoIsDepicted = `Depicts ${wd.artwork.depicts.slice(0, 6).join(', ')}.`;
          art.tags = [...new Set([...art.tags, ...wd.artwork.depicts.map(slugify)])];
        }
        if (art.yearValue == null && wd.artwork.inceptionYear) {
          art.year = wd.artwork.inceptionYear;
          art.yearValue = parseYearValue(wd.artwork.inceptionYear);
          art.provenance!.year = 'wikidata';
        }
        commonsFile = wd.artwork.commonsFile;
        artistFacts = wd.artist;
        if (artistFacts) art.externalIds = { ...art.externalIds };
        art.sourceLinks.push({ label: 'Wikidata', url: `https://www.wikidata.org/wiki/${qid}` });
      }
    }

    out.push({ artwork: art, raw, commonsFile, artistFacts });
  }
  console.log(`  enriched ${enriched}/${candidates.length} from Wikidata`);
  return out;
}

// — 4. IMAGES —
async function imageLoads(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': BROWSER_UA, Range: 'bytes=0-1023' } });
    return res.status === 200 || res.status === 206;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function commonsThumb(thumb1200: string, width: number): string {
  return thumb1200.replace(/\/\d+px-/, `/${width}px-`);
}

async function resolveImages(items: EnrichResult[]): Promise<Artwork[]> {
  console.log(`\nResolving images (museum first, Wikimedia Commons fallback)…`);
  const kept: Artwork[] = [];
  let viaCommons = 0;
  let dropped = 0;

  for (const { artwork: art, raw, commonsFile } of items) {
    let ok = false;

    // Museum image first — unless this source isn't hotlinkable.
    if (!NO_HOTLINK.has(raw.source) && raw.image && (await imageLoads(raw.image))) {
      art.imageSource = raw.source;
      art.imageLicense = IMAGE_LICENSE[raw.source] ?? 'Public Domain';
      ok = true;
    }

    // Commons fallback (also the primary path for AIC).
    if (!ok && commonsFile) {
      const ci = await resolveCommonsImage(commonsFile).catch(() => null);
      await sleep(150);
      if (ci) {
        art.image = ci.thumb;
        art.thumbnail = commonsThumb(ci.thumb, 500);
        art.imageSource = 'commons';
        art.imageLicense = ci.license;
        art.imageAttribution = ci.attribution ?? undefined;
        art.provenance!.image = 'commons';
        art.sourceLinks.push({ label: 'Image via Wikimedia Commons', url: ci.original });
        viaCommons++;
        ok = true;
      }
    }

    if (ok) kept.push(art);
    else {
      dropped++;
      process.stdout.write(`  ✗ no usable image: ${art.title}\n`);
    }
    await sleep(30);
  }
  console.log(`  kept ${kept.length} (${viaCommons} via Commons), dropped ${dropped}`);
  return kept;
}

// — 5. derive artists & museums —
function deriveArtistsAndMuseums(
  artworks: Artwork[],
  artistFactsById: Map<string, WdArtistFacts>,
): { artists: Artist[]; museums: Museum[] } {
  // Merge artists by Wikidata QID — the same artist arrives under different name
  // strings across sources (e.g. "Titian" vs "Titian (Tiziano Vecellio)").
  const qidOf = new Map<string, string>();
  for (const [aid, f] of artistFactsById) if (f.qid) qidOf.set(aid, f.qid);
  const groupKey = (aid: string) => qidOf.get(aid) ?? `id:${aid}`;

  const namesByGroup = new Map<string, Set<string>>();
  const factsByGroup = new Map<string, WdArtistFacts>();
  const movementByGroup = new Map<string, string>();
  for (const a of artworks) {
    const k = groupKey(a.artistId);
    if (!namesByGroup.has(k)) namesByGroup.set(k, new Set());
    namesByGroup.get(k)!.add(a.artist);
    if (!factsByGroup.has(k)) {
      const f = artistFactsById.get(a.artistId);
      if (f) factsByGroup.set(k, f);
    }
    if (!movementByGroup.has(k)) movementByGroup.set(k, a.movement);
  }

  // Choose a canonical name (prefer one without parentheses, then shortest).
  const canon = new Map<string, { id: string; name: string; qid?: string }>();
  for (const [k, set] of namesByGroup) {
    const arr = [...set];
    const pool = arr.filter((n) => !n.includes('(')).length ? arr.filter((n) => !n.includes('(')) : arr;
    const name = pool.sort((a, b) => a.length - b.length)[0];
    canon.set(k, { id: slugify(name), name, qid: k.startsWith('id:') ? undefined : k });
  }

  const artworkIdsByCanon = new Map<string, string[]>();
  for (const a of artworks) {
    const c = canon.get(groupKey(a.artistId))!;
    if (!artworkIdsByCanon.has(c.id)) artworkIdsByCanon.set(c.id, []);
    artworkIdsByCanon.get(c.id)!.push(a.id);
  }
  // Remap every artwork to its canonical artist id.
  const groupKeyByCanonId = new Map<string, string>();
  for (const [k, c] of canon) if (!groupKeyByCanonId.has(c.id)) groupKeyByCanonId.set(c.id, k);
  for (const a of artworks) a.artistId = canon.get(groupKey(a.artistId))!.id;

  const artists: Artist[] = [];
  for (const [id, ids] of artworkIdsByCanon) {
    const k = groupKeyByCanonId.get(id)!;
    const f = factsByGroup.get(k);
    artists.push({
      id,
      name: canon.get(k)!.name,
      portrait: null,
      birthYear: f?.birthYear ?? null,
      deathYear: f?.deathYear ?? null,
      nationality: f?.nationality ?? null,
      bio: f?.bio ?? null,
      bioStatus: 'metadata-fallback',
      movement: f?.movement ?? movementByGroup.get(k) ?? null,
      artworkIds: ids,
      relatedArtistIds: [],
      externalIds: canon.get(k)!.qid ? { wikidata: canon.get(k)!.qid! } : undefined,
    });
  }
  for (const artist of artists) {
    artist.relatedArtistIds = artists
      .filter((o) => o.id !== artist.id && o.movement === artist.movement)
      .slice(0, 6)
      .map((o) => o.id);
  }

  const MUSEUM_META: Record<string, { founded: string; history: string; map: string }> = {
    'the-metropolitan-museum-of-art': {
      founded: '1870',
      history:
        'One of the largest and most-visited art museums in the world, the Met holds over two million works spanning 5,000 years of human creativity across its galleries on Fifth Avenue.',
      map: 'https://maps.google.com/?q=The+Metropolitan+Museum+of+Art',
    },
    'art-institute-of-chicago': {
      founded: '1879',
      history:
        'Home to one of the finest collections of Impressionist and American art, the Art Institute of Chicago is renowned for masterpieces such as Grant Wood’s American Gothic and Seurat’s A Sunday on La Grande Jatte.',
      map: 'https://maps.google.com/?q=Art+Institute+of+Chicago',
    },
    'cleveland-museum-of-art': {
      founded: '1913',
      history:
        'The Cleveland Museum of Art is celebrated for its encyclopedic collection and a long-standing commitment to free public admission and open access to its holdings.',
      map: 'https://maps.google.com/?q=Cleveland+Museum+of+Art',
    },
  };
  const museumMap = new Map<string, Museum>();
  for (const a of artworks) {
    if (!museumMap.has(a.museumId)) {
      const meta = MUSEUM_META[a.museumId];
      museumMap.set(a.museumId, {
        id: a.museumId,
        name: a.museum,
        location: a.museumLocation,
        foundedYear: meta?.founded ?? null,
        history: meta?.history ?? null,
        historyStatus: meta ? 'enriched' : 'unavailable',
        artworkIds: [],
        mapUrl: meta?.map ?? `https://maps.google.com/?q=${encodeURIComponent(a.museum)}`,
      });
    }
    museumMap.get(a.museumId)!.artworkIds.push(a.id);
  }

  return { artists, museums: [...museumMap.values()] };
}

async function main() {
  console.log('Collecting artworks from multiple open sources…\n');

  // 1. collect + dedupe (by source id, then by title+artist across sources).
  const rows = await gather();
  const deduped = uniqueBy(
    uniqueBy(rows, (r) => `${r.raw.source}-${r.raw.sourceId}`),
    (r) => `${slugify(r.raw.title)}::${slugify(r.raw.artist)}`,
  ).slice(0, TARGET_SIZE);

  // 2/3. resolve Wikidata identity + enrich.
  const enriched = await resolveAndEnrich(deduped);

  // 4. resolve + verify images.
  const artworks = await resolveImages(enriched);

  // Dedupe again by Wikidata QID (merges the same work across sources/records).
  const byQid = new Map<string, Artwork>();
  const finalArtworks: Artwork[] = [];
  for (const a of artworks) {
    const qid = a.externalIds?.wikidata;
    if (qid) {
      if (byQid.has(qid)) continue;
      byQid.set(qid, a);
    }
    finalArtworks.push(a);
  }

  // 5. derive artists (with Wikidata facts) + museums.
  const artistFactsById = new Map<string, WdArtistFacts>();
  for (const e of enriched) {
    if (e.artistFacts) artistFactsById.set(e.artwork.artistId, e.artistFacts);
  }
  const { artists, museums } = deriveArtistsAndMuseums(finalArtworks, artistFactsById);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, 'artworks.json'), JSON.stringify(finalArtworks, null, 2));
  await writeFile(join(DATA_DIR, 'artists.json'), JSON.stringify(artists, null, 2));
  await writeFile(join(DATA_DIR, 'museums.json'), JSON.stringify(museums, null, 2));

  const imgStats = finalArtworks.reduce<Record<string, number>>((m, a) => {
    m[a.imageSource ?? '?'] = (m[a.imageSource ?? '?'] ?? 0) + 1;
    return m;
  }, {});
  console.log(`\n✓ Wrote ${finalArtworks.length} artworks, ${artists.length} artists, ${museums.length} museums`);
  console.log(`  images: ${JSON.stringify(imgStats)}`);
  console.log('  Next: `npm run data:enrich` (set ANTHROPIC_API_KEY) for rich prose.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
