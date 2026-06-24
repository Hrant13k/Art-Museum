// Art Institute of Chicago — open API, no key required.
// Docs: https://api.artic.edu/docs/
import { fetchJson } from '../lib/util.js';
import type { NormalizedRaw } from '../lib/normalized.js';

const BASE = 'https://api.artic.edu/api/v1';
const IIIF = 'https://www.artic.edu/iiif/2';

interface AicArtwork {
  id: number;
  title: string;
  artist_display: string;
  artist_title: string | null;
  date_display: string;
  medium_display: string;
  place_of_origin: string | null;
  department_title: string | null;
  classification_title: string | null;
  style_titles: string[];
  image_id: string | null;
  main_reference_number?: string;
}

const FIELDS = [
  'id', 'title', 'artist_display', 'artist_title', 'date_display',
  'medium_display', 'place_of_origin', 'department_title',
  'classification_title', 'style_titles', 'image_id', 'main_reference_number',
].join(',');

function toNormalized(a: AicArtwork): NormalizedRaw | null {
  if (!a.image_id) return null;
  // artist_display can be multi-line; take the first line as the name.
  const artist = (a.artist_title || a.artist_display || 'Unknown artist').split('\n')[0].trim();
  return {
    source: 'aic',
    sourceId: String(a.id),
    title: a.title?.trim() || 'Untitled',
    artist: artist || 'Unknown artist',
    yearDisplay: a.date_display || '',
    museum: 'Art Institute of Chicago',
    museumLocation: 'Chicago, USA',
    image: `${IIIF}/${a.image_id}/full/1200,/0/default.jpg`,
    thumbnail: `${IIIF}/${a.image_id}/full/400,/0/default.jpg`,
    medium: a.medium_display || '',
    culture: a.place_of_origin || '',
    department: a.department_title || '',
    classification: a.classification_title || '',
    styles: a.style_titles || [],
    sourceUrl: `https://www.artic.edu/artworks/${a.id}`,
    accession: a.main_reference_number || '',
    qid: null,
  };
}

export async function searchAic(query: string, limit: number): Promise<NormalizedRaw[]> {
  const url =
    `${BASE}/artworks/search?q=${encodeURIComponent(query)}` +
    `&fields=${FIELDS}&limit=${limit}`;
  const res = await fetchJson<{ data: AicArtwork[] }>(url);
  const out: NormalizedRaw[] = [];
  for (const a of res?.data ?? []) {
    const n = toNormalized(a);
    if (n) out.push(n);
  }
  return out;
}
