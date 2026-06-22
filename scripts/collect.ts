// Data collection: fetch from public museum APIs, normalize, de-duplicate,
// and build the local JSON database (artworks, artists, museums).
//
//   npm run data:collect
//
// Content enrichment (overview/creation story/etc.) is a separate step:
//   npm run data:enrich
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PLANS, TARGET_SIZE } from './config.js';
import { fetchMetObjects, searchMet } from './sources/met.js';
import { searchAic } from './sources/aic.js';
import { searchCma } from './sources/cma.js';
import { slugify, cleanYear, parseYearValue, uniqueBy, sleep } from './lib/util.js';
import type { NormalizedRaw } from './lib/normalized.js';
import type { Artwork, Artist, Museum } from '../src/types/artwork.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

function metadataFallback(raw: NormalizedRaw, movement: string) {
  const bits: string[] = [];
  if (raw.medium) bits.push(raw.medium);
  if (raw.culture) bits.push(raw.culture);
  const detail = bits.length ? ` ${bits.join(', ')}.` : '';
  return {
    overview:
      `${raw.title} by ${raw.artist}${raw.yearDisplay ? `, ${raw.yearDisplay}` : ''}.${detail} ` +
      `Held by ${raw.museum}.`,
    creationStory: 'A detailed creation story is not yet available for this work.',
    whoIsDepicted: 'Information about the subject is not yet available for this work.',
    historicalContext: movement
      ? `Associated with ${movement}.`
      : 'Historical context is not yet available for this work.',
    interestingFacts: [] as string[],
  };
}

function buildTags(raw: NormalizedRaw, planTags: string[], movement: string): string[] {
  const t = new Set<string>(planTags);
  t.add(slugify(movement));
  if (raw.classification) t.add(slugify(raw.classification));
  if (raw.department) t.add(slugify(raw.department));
  for (const s of raw.styles) t.add(slugify(s));
  const cls = raw.classification.toLowerCase();
  const med = raw.medium.toLowerCase();
  if (/sculpt|marble|bronze/.test(cls + med)) t.add('sculpture');
  if (/photo/.test(cls + med)) t.add('photography');
  if (/print|woodblock|etching|engraving/.test(cls + med)) t.add('print');
  if (/paint|oil|canvas|tempera/.test(cls + med)) t.add('painting');
  return [...t].filter(Boolean);
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/** Confirm an image loads cross-origin (no special referer), as a browser would. */
async function imageLoads(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': BROWSER_UA, Range: 'bytes=0-1023' },
    });
    return res.status === 200 || res.status === 206;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Drop artworks whose images do not load cross-origin. */
async function verifyImages(artworks: Artwork[]): Promise<Artwork[]> {
  console.log(`\nVerifying ${artworks.length} images load cross-origin…`);
  const kept: Artwork[] = [];
  let dropped = 0;
  for (const art of artworks) {
    if (await imageLoads(art.image)) kept.push(art);
    else {
      dropped++;
      process.stdout.write(`  ✗ dropped (image unreachable): ${art.title}\n`);
    }
    await sleep(40);
  }
  console.log(`  kept ${kept.length}, dropped ${dropped}`);
  return kept;
}

async function gather(): Promise<{ raw: NormalizedRaw; movement: string; tags: string[] }[]> {
  const results: { raw: NormalizedRaw; movement: string; tags: string[] }[] = [];
  for (const plan of PLANS) {
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
      results.push({ raw, movement, tags: buildTags(raw, plan.tags, movement) });
    }
    await sleep(700); // pause between queries to stay under rate limits
  }
  return results;
}

function buildArtworks(rows: { raw: NormalizedRaw; movement: string; tags: string[] }[]): Artwork[] {
  // De-dup by source id, then by normalized title+artist across sources.
  const bySource = uniqueBy(rows, (r) => `${r.raw.source}-${r.raw.sourceId}`);
  const deduped = uniqueBy(bySource, (r) => `${slugify(r.raw.title)}::${slugify(r.raw.artist)}`)
    .slice(0, TARGET_SIZE);

  return deduped.map(({ raw, movement, tags }) => {
    const fallback = metadataFallback(raw, movement);
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
      ...fallback,
    };
  });
}

function deriveArtistsAndMuseums(artworks: Artwork[]): { artists: Artist[]; museums: Museum[] } {
  // Derive artists.
  const artistMap = new Map<string, Artist>();
  for (const a of artworks) {
    if (!artistMap.has(a.artistId)) {
      artistMap.set(a.artistId, {
        id: a.artistId,
        name: a.artist,
        portrait: null,
        birthYear: null,
        deathYear: null,
        nationality: null,
        bio: null,
        bioStatus: 'unavailable',
        movement: a.movement,
        artworkIds: [],
        relatedArtistIds: [],
      });
    }
    artistMap.get(a.artistId)!.artworkIds.push(a.id);
  }
  // Relate artists that share a movement.
  const artists = [...artistMap.values()];
  for (const artist of artists) {
    artist.relatedArtistIds = artists
      .filter((o) => o.id !== artist.id && o.movement === artist.movement)
      .slice(0, 6)
      .map((o) => o.id);
  }

  // Derive museums.
  const museumMap = new Map<string, Museum>();
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
  console.log('Collecting artworks from public museum APIs…\n');
  const rows = await gather();
  const built = buildArtworks(rows);
  const artworks = await verifyImages(built);
  const { artists, museums } = deriveArtistsAndMuseums(artworks);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, 'artworks.json'), JSON.stringify(artworks, null, 2));
  await writeFile(join(DATA_DIR, 'artists.json'), JSON.stringify(artists, null, 2));
  await writeFile(join(DATA_DIR, 'museums.json'), JSON.stringify(museums, null, 2));

  console.log(
    `\n✓ Wrote ${artworks.length} artworks, ${artists.length} artists, ${museums.length} museums to data/`,
  );
  console.log('  Next: run `npm run data:enrich` (set ANTHROPIC_API_KEY) to add rich content.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
