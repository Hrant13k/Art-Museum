// Metropolitan Museum of Art — open API, no key required.
// Docs: https://metmuseum.github.io/
import { fetchJson, sleep } from '../lib/util.js';
import { qidFromUrl } from '../lib/wikidata.js';
import type { NormalizedRaw } from '../lib/normalized.js';

const BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';

interface MetObject {
  objectID: number;
  isPublicDomain: boolean;
  primaryImage: string;
  primaryImageSmall: string;
  title: string;
  artistDisplayName: string;
  objectDate: string;
  medium: string;
  culture: string;
  department: string;
  classification: string;
  objectURL: string;
  accessionNumber: string;
  objectWikidata_URL?: string;
  GalleryNumber?: string;
}

function toNormalized(o: MetObject): NormalizedRaw | null {
  if (!o.primaryImage && !o.primaryImageSmall) return null;
  return {
    source: 'met',
    sourceId: String(o.objectID),
    title: o.title?.trim() || 'Untitled',
    artist: o.artistDisplayName?.trim() || 'Unknown artist',
    yearDisplay: o.objectDate || '',
    museum: 'The Metropolitan Museum of Art',
    museumLocation: 'New York, USA',
    image: o.primaryImage || o.primaryImageSmall,
    thumbnail: o.primaryImageSmall || o.primaryImage,
    medium: o.medium || '',
    culture: o.culture || '',
    department: o.department || '',
    classification: o.classification || '',
    styles: [],
    sourceUrl: o.objectURL || `https://www.metmuseum.org/art/collection/search/${o.objectID}`,
    accession: o.accessionNumber || '',
    qid: qidFromUrl(o.objectWikidata_URL),
  };
}

export async function fetchMetObjects(ids: number[]): Promise<NormalizedRaw[]> {
  const out: NormalizedRaw[] = [];
  for (const id of ids) {
    const obj = await fetchJson<MetObject>(`${BASE}/objects/${id}`);
    await sleep(120); // be polite
    if (!obj) continue;
    const n = toNormalized(obj);
    if (n) out.push(n);
  }
  return out;
}

export async function searchMet(query: string, limit: number): Promise<NormalizedRaw[]> {
  const url = `${BASE}/search?hasImages=true&q=${encodeURIComponent(query)}`;
  const res = await fetchJson<{ objectIDs: number[] | null }>(url);
  const ids = (res?.objectIDs ?? []).slice(0, limit * 3); // over-fetch; many lack usable images
  const out: NormalizedRaw[] = [];
  for (const id of ids) {
    if (out.length >= limit) break;
    const obj = await fetchJson<MetObject>(`${BASE}/objects/${id}`);
    await sleep(120);
    if (!obj) continue;
    const n = toNormalized(obj);
    if (n) out.push(n);
  }
  return out;
}
