// Cleveland Museum of Art — open access API, no key required.
// Docs: https://openaccess-api.clevelandart.org/
import { fetchJson } from '../lib/util.js';
import type { NormalizedRaw } from '../lib/normalized.js';

const BASE = 'https://openaccess-api.clevelandart.org/api/artworks';

interface CmaArtwork {
  id: number;
  accession_number?: string;
  title: string;
  creators?: { description: string }[];
  creation_date: string | null;
  technique: string | null;
  culture?: string[];
  department: string | null;
  type: string | null;
  url: string;
  images?: { web?: { url: string }; print?: { url: string } };
}

function toNormalized(a: CmaArtwork): NormalizedRaw | null {
  const web = a.images?.web?.url;
  if (!web) return null;
  const artist = a.creators?.[0]?.description?.split('(')[0].trim() || 'Unknown artist';
  return {
    source: 'cma',
    sourceId: String(a.id),
    title: a.title?.trim() || 'Untitled',
    artist,
    yearDisplay: a.creation_date || '',
    museum: 'Cleveland Museum of Art',
    museumLocation: 'Cleveland, USA',
    image: a.images?.print?.url || web,
    thumbnail: web,
    medium: a.technique || '',
    culture: a.culture?.[0] || '',
    department: a.department || '',
    classification: a.type || '',
    styles: [],
    sourceUrl: a.url || `https://www.clevelandart.org/art/${a.id}`,
    accession: a.accession_number || '',
    qid: null,
  };
}

export async function searchCma(query: string, limit: number): Promise<NormalizedRaw[]> {
  const url =
    `${BASE}?q=${encodeURIComponent(query)}&has_image=1&cc0=1&limit=${limit}`;
  const res = await fetchJson<{ data: CmaArtwork[] }>(url);
  const out: NormalizedRaw[] = [];
  for (const a of res?.data ?? []) {
    const n = toNormalized(a);
    if (n) out.push(n);
  }
  return out;
}
