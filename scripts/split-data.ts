/**
 * Split the canonical artworks.json into:
 *   1. data/artworks.light.json   — the fields every page needs (browse, search,
 *      swipe, home). Bundled into the app, parsed on first load.
 *   2. public/data/details.json   — the heavy, detail-only fields keyed by id
 *      (creation story, who is depicted, facts, source links, …). Fetched lazily
 *      by the artwork viewer and cached by the service worker.
 *
 * Roughly 40% of the dataset is detail prose only ever seen when a user expands
 * a section on a single artwork — keeping it out of the bundle is what makes the
 * client routes light again. Run by `prebuild`, so production builds always use
 * a fresh, in-sync split.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const PUBLIC_DATA_DIR = join(__dirname, '..', 'public', 'data');

// Fields the client UI reads directly (cards, search, viewer label, home, etc.).
const LIGHT_FIELDS = [
  'id',
  'title',
  'artist',
  'artistId',
  'year',
  'yearValue',
  'museum',
  'museumId',
  'museumLocation',
  'thumbnail',
  'movement',
  'medium',
  'tags',
  'overview',
  'enrichmentStatus',
] as const;

// Fields read only inside the expanded artwork viewer.
const DETAIL_FIELDS = [
  'creationStory',
  'whoIsDepicted',
  'historicalContext',
  'interestingFacts',
  'sourceLinks',
  'depicts',
  'provenance',
] as const;

function pick<T extends Record<string, unknown>>(obj: T, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

async function main() {
  const raw = await readFile(join(DATA_DIR, 'artworks.json'), 'utf8');
  const artworks = JSON.parse(raw) as Array<Record<string, unknown>>;

  const light = artworks.map((a) => pick(a, LIGHT_FIELDS));
  const details: Record<string, unknown> = {};
  for (const a of artworks) details[a.id as string] = pick(a, DETAIL_FIELDS);

  await mkdir(PUBLIC_DATA_DIR, { recursive: true });
  // Light index is bundled, so minify it; details.json is fetched, keep it compact too.
  await writeFile(join(DATA_DIR, 'artworks.light.json'), JSON.stringify(light));
  await writeFile(join(PUBLIC_DATA_DIR, 'details.json'), JSON.stringify(details));

  const lightKB = Math.round(Buffer.byteLength(JSON.stringify(light)) / 1024);
  const detailKB = Math.round(Buffer.byteLength(JSON.stringify(details)) / 1024);
  console.log(`split ${artworks.length} artworks → light ${lightKB}KB (bundled), details ${detailKB}KB (lazy)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
