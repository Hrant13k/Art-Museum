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
import { ALL_ARTISTS, PER_ARTIST_LIMIT, type ArtistSeed } from './artists.js';
import { searchMet } from './sources/met.js';
import { searchAic } from './sources/aic.js';
import { searchCma } from './sources/cma.js';
import { enrichFromWikidata, type WdArtistFacts } from './sources/wikidata.js';
import {
  resolveArtistQid,
  fetchWorksByArtist,
  enrichArtistProfile,
  type WdArtistProfile,
} from './sources/wikidata-artworks.js';
import { findArtworkQid, MUSEUM_QID } from './lib/wikidata.js';
import { resolveCommonsImage, commonsUrl } from './sources/commons.js';
import { slugify, cleanYear, parseYearValue, uniqueBy, sleep } from './lib/util.js';
import type { NormalizedRaw } from './lib/normalized.js';
import type { Artwork, Artist, Museum } from '../src/types/artwork.js';

/** A resolved artist profile keyed for reuse during artist derivation. */
export type ArtistProfile = WdArtistProfile & { portrait: string | null };

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

// Sources whose images are NOT reliably hotlinkable cross-origin → force Commons.
const NO_HOTLINK = new Set(['aic']);

const IMAGE_LICENSE: Record<string, string> = { met: 'Public Domain', cma: 'CC0' };

// Factual one-line overview assembled from verified metadata only. Other prose
// fields are left EMPTY unless a verified source (Wikidata) or the enrichment
// step can fill them — we never generate unsupported content.
function factualOverview(title: string, artist: string, year: string, medium: string, museum: string) {
  const bits = [medium].filter((b) => b && b !== 'Medium unknown');
  const detail = bits.length ? ` ${bits.join(', ')}.` : '';
  const date = year && year !== 'Date unknown' ? `, ${year}` : '';
  return `${title} by ${artist}${date}.${detail}${museum ? ` Held by ${museum}.` : ''}`;
}

function emptyContent(depicts: string[]) {
  return {
    overview: '',
    creationStory: '',
    whoIsDepicted: depicts.length ? `Depicts ${depicts.slice(0, 6).join(', ')}.` : '',
    historicalContext: '',
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
  const year = cleanYear(raw.yearDisplay);
  const content = emptyContent([]);
  content.overview = factualOverview(raw.title, raw.artist, year, raw.medium, raw.museum);
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
    ...content,
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
      await sleep(450); // Commons API throttles aggressively — stay gentle
      if (ci) {
        art.image = commonsUrl(ci.file, 1200);
        art.thumbnail = commonsUrl(ci.file, 500);
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

// — Wikidata artist path: build artworks directly from an artist's works —
function makeWikidataRaw(qid: string, title: string): NormalizedRaw {
  return {
    source: 'wikidata', sourceId: qid, title, artist: '', yearDisplay: '',
    museum: '', museumLocation: '', image: '', thumbnail: '', medium: '',
    culture: '', department: '', classification: '', styles: [], sourceUrl: '',
    accession: '', qid,
  };
}

function buildWikidataArtwork(seed: ArtistSeed, w: import('./sources/wikidata-artworks.js').WdWork): Artwork {
  const year = w.year ? cleanYear(w.year) : 'Date unknown';
  const tags = new Set<string>(seed.tags ?? []);
  if (w.movement) tags.add(slugify(w.movement));
  for (const d of w.depicts) tags.add(slugify(d));
  const blob = w.material.toLowerCase();
  if (/sculpt|marble|bronze/.test(blob)) tags.add('sculpture');
  if (/print|woodcut|woodblock|etching|engraving|lithograph/.test(blob)) tags.add('print');
  if (/oil|canvas|tempera|panel|fresco|watercolou?r|paint/.test(blob)) tags.add('painting');
  return {
    id: `wikidata-${w.qid}`,
    source: 'wikidata',
    sourceId: w.qid,
    title: w.title,
    artist: seed.name,
    artistId: slugify(seed.name),
    year,
    yearValue: parseYearValue(w.year ?? ''),
    museum: w.collection || 'Various collections',
    museumId: slugify(w.collection || 'various-collections'),
    museumLocation: '',
    image: '',
    thumbnail: '',
    movement: w.movement || '',
    medium: w.material || 'Medium unknown',
    culture: '',
    department: '',
    tags: [...tags].filter(Boolean),
    enrichmentStatus: 'metadata-fallback',
    sourceLinks: [{ label: 'Wikidata', url: `https://www.wikidata.org/wiki/${w.qid}` }],
    externalIds: { wikidata: w.qid },
    depicts: w.depicts,
    provenance: { title: 'wikidata', artist: 'curation', movement: w.movement ? 'wikidata' : '' },
    overview: factualOverview(w.title, seed.name, year, w.material, w.collection),
    creationStory: '',
    whoIsDepicted: w.depicts.length ? `Depicts ${w.depicts.slice(0, 6).join(', ')}.` : '',
    historicalContext: '',
    interestingFacts: [],
  };
}

async function gatherFromWikidata(
  seeds: ArtistSeed[],
  limit: number,
): Promise<{ results: EnrichResult[]; artistQids: Map<string, string> }> {
  console.log(`\nCollecting from Wikidata for ${seeds.length} artists…`);
  const results: EnrichResult[] = [];
  const artistQids = new Map<string, string>();
  for (const seed of seeds) {
    let qid = await resolveArtistQid(seed.name);
    if (!qid && seed.alt) qid = await resolveArtistQid(seed.alt);
    await sleep(200);
    if (!qid) {
      console.log(`  • ${seed.name}: artist not found`);
      continue;
    }
    artistQids.set(slugify(seed.name), qid);
    const works = await fetchWorksByArtist(qid, limit).catch(() => []);
    console.log(`  • ${seed.name} (${qid}): ${works.length} works with a free image`);
    for (const w of works) {
      results.push({
        artwork: buildWikidataArtwork(seed, w),
        raw: makeWikidataRaw(w.qid, w.title),
        commonsFile: w.imageFile,
        artistFacts: null,
      });
    }
    await sleep(300);
  }
  return { results, artistQids };
}

// Build a rich profile (portrait, influences, dates) for every artist in the set.
async function enrichArtistProfiles(
  artistQidById: Map<string, string>,
): Promise<Map<string, ArtistProfile>> {
  const byQid = new Map<string, string[]>();
  for (const [aid, qid] of artistQidById) {
    if (!byQid.has(qid)) byQid.set(qid, []);
    byQid.get(qid)!.push(aid);
  }
  console.log(`\nEnriching ${byQid.size} artist profiles (portraits, influences)…`);
  const out = new Map<string, ArtistProfile>();
  let portraits = 0;
  for (const [qid, aids] of byQid) {
    const prof = await enrichArtistProfile(qid).catch(() => null);
    await sleep(400);
    if (!prof) continue;
    let portrait: string | null = null;
    if (prof.portraitFile) {
      const ci = await resolveCommonsImage(prof.portraitFile).catch(() => null);
      await sleep(450);
      if (ci) {
        portrait = commonsUrl(ci.file, 400);
        portraits++;
      }
    }
    const full: ArtistProfile = { ...prof, portrait };
    for (const aid of aids) out.set(aid, full);
  }
  console.log(`  ${out.size} profiles, ${portraits} with portraits`);
  return out;
}

// — 5. derive artists & museums —
function deriveArtistsAndMuseums(
  artworks: Artwork[],
  profilesById: Map<string, ArtistProfile>,
): { artists: Artist[]; museums: Museum[] } {
  // Merge artists by Wikidata QID — the same artist arrives under different name
  // strings across sources (e.g. "Titian" vs "Titian (Tiziano Vecellio)").
  const qidOf = new Map<string, string>();
  for (const [aid, p] of profilesById) if (p.qid) qidOf.set(aid, p.qid);
  const groupKey = (aid: string) => qidOf.get(aid) ?? `id:${aid}`;

  const namesByGroup = new Map<string, Set<string>>();
  const profileByGroup = new Map<string, ArtistProfile>();
  const movementByGroup = new Map<string, string>();
  for (const a of artworks) {
    const k = groupKey(a.artistId);
    if (!namesByGroup.has(k)) namesByGroup.set(k, new Set());
    namesByGroup.get(k)!.add(a.artist);
    if (!profileByGroup.has(k)) {
      const p = profilesById.get(a.artistId);
      if (p) profileByGroup.set(k, p);
    }
    if (!movementByGroup.has(k) && a.movement) movementByGroup.set(k, a.movement);
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
    const p = profileByGroup.get(k);
    artists.push({
      id,
      name: canon.get(k)!.name,
      portrait: p?.portrait ?? null,
      birthYear: p?.birthYear ?? null,
      deathYear: p?.deathYear ?? null,
      nationality: p?.nationality ?? null,
      bio: p?.bio ?? null,
      bioStatus: 'metadata-fallback',
      movement: p?.movement ?? movementByGroup.get(k) ?? null,
      artworkIds: ids,
      relatedArtistIds: [],
      influencedBy: p?.influencedBy?.length ? p.influencedBy : undefined,
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

  // Path A — museum APIs (Met, Cleveland, AIC).
  const rows = await gather();
  const museumDedup = uniqueBy(rows, (r) => `${r.raw.source}-${r.raw.sourceId}`);
  const museumEnriched = await resolveAndEnrich(museumDedup);

  // Path B — Wikidata, by artist (masters + Armenian roster).
  const seeds = process.env.MAX_ARTISTS ? ALL_ARTISTS.slice(0, Number(process.env.MAX_ARTISTS)) : ALL_ARTISTS;
  const { results: wikiEnriched, artistQids } = await gatherFromWikidata(seeds, PER_ARTIST_LIMIT);

  // Merge + dedupe: by record id, then by Wikidata QID, then by title+artist.
  let enriched = uniqueBy([...museumEnriched, ...wikiEnriched], (e) => e.artwork.id);
  const seenQid = new Set<string>();
  enriched = enriched.filter((e) => {
    const q = e.artwork.externalIds?.wikidata;
    if (!q) return true;
    if (seenQid.has(q)) return false;
    seenQid.add(q);
    return true;
  });
  enriched = uniqueBy(enriched, (e) => `${slugify(e.artwork.title)}::${slugify(e.artwork.artist)}`);
  console.log(`\nMerged → ${enriched.length} unique candidates (capped at ${TARGET_SIZE}).`);
  enriched = enriched.slice(0, TARGET_SIZE);

  // Resolve + verify images (museum first, Commons fallback / primary for Wikidata).
  const finalArtworks = await resolveImages(enriched);

  // Artist profiles: gather every artist QID we know, then enrich once each.
  const artistQidById = new Map<string, string>(artistQids);
  for (const e of museumEnriched) {
    if (e.artistFacts?.qid && !artistQidById.has(e.artwork.artistId)) {
      artistQidById.set(e.artwork.artistId, e.artistFacts.qid);
    }
  }
  const profiles = await enrichArtistProfiles(artistQidById);

  const { artists, museums } = deriveArtistsAndMuseums(finalArtworks, profiles);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, 'artworks.json'), JSON.stringify(finalArtworks, null, 2));
  await writeFile(join(DATA_DIR, 'artists.json'), JSON.stringify(artists, null, 2));
  await writeFile(join(DATA_DIR, 'museums.json'), JSON.stringify(museums, null, 2));

  const imgStats = finalArtworks.reduce<Record<string, number>>((m, a) => {
    m[a.imageSource ?? '?'] = (m[a.imageSource ?? '?'] ?? 0) + 1;
    return m;
  }, {});
  const withPortrait = artists.filter((a) => a.portrait).length;
  console.log(`\n✓ Wrote ${finalArtworks.length} artworks, ${artists.length} artists (${withPortrait} with portraits), ${museums.length} museums`);
  console.log(`  images: ${JSON.stringify(imgStats)}`);
  console.log('  Next: `npm run data:enrich` (set ANTHROPIC_API_KEY) for rich prose.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
