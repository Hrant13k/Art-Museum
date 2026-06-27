// Wikidata-driven collection. For a named artist we resolve their QID, pull
// their most-famous works that have a freely-licensed image, and build artist
// profiles (portrait, influences, dates). Everything here is CC0 metadata; the
// images themselves are resolved + licence-checked via Wikimedia Commons.
import { fetchJson, sleep } from '../lib/util.js';
import {
  sparql,
  getEntities,
  getLabels,
  claimItemIds,
  claimStrings,
  claimYear,
  qidFromUrl,
} from '../lib/wikidata.js';

const SEARCH_API = 'https://www.wikidata.org/w/api.php';

/** Resolve an artist name to a QID. Exact-label + artist occupation first, then search. */
export async function resolveArtistQid(name: string): Promise<string | null> {
  const occ = 'wd:Q1028181 wd:Q1281618 wd:Q483501 wd:Q644687 wd:Q15296811'; // painter, sculptor, artist, illustrator, graphic artist
  const q = `SELECT ?item (MAX(?sl) AS ?fame) WHERE {
    ?item rdfs:label "${name.replace(/"/g, '')}"@en ; wdt:P106 ?o ; wikibase:sitelinks ?sl .
    VALUES ?o { ${occ} }
  } GROUP BY ?item ORDER BY DESC(?fame) LIMIT 1`;
  try {
    const rows = await sparql(q);
    const qid = qidFromUrl(rows[0]?.item?.value);
    if (qid) return qid;
  } catch {
    /* fall through */
  }
  // Fallback: full-text search, pick a candidate described as an artist.
  const url = `${SEARCH_API}?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=10&format=json&origin=*`;
  const res = await fetchJson<{ search: { id: string; description?: string }[] }>(url);
  const hit = (res?.search ?? []).find((s) =>
    /pain|artist|sculpt|illustrat|engrav|draughts|print/i.test(s.description ?? ''),
  );
  return hit?.id ?? null;
}

export interface WdWork {
  qid: string;
  title: string;
  imageFile: string; // Commons filename
  year: string | null;
  material: string;
  collection: string;
  movement: string;
  depicts: string[];
}

/** Pull an artist's most-famous works (by sitelink count) that carry a free image. */
export async function fetchWorksByArtist(artistQid: string, limit: number): Promise<WdWork[]> {
  // 1) light query — top works by fame
  const top = await sparql(
    `SELECT ?item (MAX(?sl) AS ?fame) WHERE {
       ?item wdt:P170 wd:${artistQid} ; wdt:P18 ?img ; wikibase:sitelinks ?sl .
     } GROUP BY ?item ORDER BY DESC(?fame) LIMIT ${limit}`,
  ).catch(() => []);
  const qids = top.map((r) => qidFromUrl(r.item?.value)).filter((q): q is string => !!q);
  if (qids.length === 0) return [];
  await sleep(200);

  // 2) hydrate via entities (reuses the throttled batch loader)
  const ents = await getEntities(qids);
  const refQids: string[] = [];
  for (const qid of qids) {
    const e = ents[qid];
    if (!e) continue;
    refQids.push(
      ...claimItemIds(e, 'P186'),
      ...claimItemIds(e, 'P195'),
      ...claimItemIds(e, 'P135'),
      ...claimItemIds(e, 'P180').slice(0, 8),
    );
  }
  const labels = await getLabels(refQids);

  const works: WdWork[] = [];
  for (const qid of qids) {
    const e = ents[qid];
    if (!e) continue;
    const title = e.labels?.en?.value;
    const imageFile = claimStrings(e, 'P18')[0];
    if (!title || !imageFile) continue;
    works.push({
      qid,
      title,
      imageFile,
      year: claimYear(e, 'P571'),
      material: claimItemIds(e, 'P186').map((id) => labels[id]).filter(Boolean)[0] ?? '',
      collection: claimItemIds(e, 'P195').map((id) => labels[id]).filter(Boolean)[0] ?? '',
      movement: claimItemIds(e, 'P135').map((id) => labels[id]).filter(Boolean)[0] ?? '',
      depicts: claimItemIds(e, 'P180').slice(0, 8).map((id) => labels[id]).filter(Boolean),
    });
  }
  return works;
}

export interface WdArtistProfile {
  qid: string;
  portraitFile: string | null; // Commons filename of the artist's image (P18)
  birthYear: string | null;
  deathYear: string | null;
  nationality: string | null;
  movement: string | null;
  bio: string | null;
  influencedBy: string[];
  enwikiUrl: string | null;
}

/** Build a rich artist profile from the person entity. */
export async function enrichArtistProfile(qid: string): Promise<WdArtistProfile | null> {
  const ents = await getEntities([qid]);
  const e = ents[qid];
  if (!e) return null;
  const natIds = claimItemIds(e, 'P27');
  const movIds = claimItemIds(e, 'P135');
  const inflIds = claimItemIds(e, 'P737').slice(0, 8);
  const labels = await getLabels([...natIds, ...movIds, ...inflIds]);
  const enTitle = e.sitelinks?.enwiki?.title;
  return {
    qid,
    portraitFile: claimStrings(e, 'P18')[0] ?? null,
    birthYear: claimYear(e, 'P569'),
    deathYear: claimYear(e, 'P570'),
    nationality: natIds.map((id) => labels[id]).filter(Boolean)[0] ?? null,
    movement: movIds.map((id) => labels[id]).filter(Boolean)[0] ?? null,
    bio: e.descriptions?.en?.value ?? null,
    influencedBy: inflIds.map((id) => labels[id]).filter(Boolean),
    enwikiUrl: enTitle
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(enTitle.replace(/ /g, '_'))}`
      : null,
  };
}
