// Wikidata access helpers. Wikidata data is CC0, so everything here is safe to
// store. We use the Action API (wbgetentities) for entities/labels and the
// SPARQL endpoint to match museum accession numbers to items.
import { fetchJson, sleep } from './util.js';

const ENTITY_API = 'https://www.wikidata.org/w/api.php';
const SPARQL = 'https://query.wikidata.org/sparql';

// Museum entity QIDs, for accession-number lookups.
export const MUSEUM_QID: Record<string, string> = {
  met: 'Q160236',
  aic: 'Q239303',
  cma: 'Q657415',
  rijksmuseum: 'Q190804',
};

export function qidFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/Q\d+/);
  return m ? m[0] : null;
}

export interface WdEntity {
  id: string;
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, any[]>;
  sitelinks?: Record<string, { title: string }>;
}

/** Fetch full entities (claims + labels + descriptions + sitelinks). */
export async function getEntities(ids: string[]): Promise<Record<string, WdEntity>> {
  if (ids.length === 0) return {};
  const out: Record<string, WdEntity> = {};
  // The API accepts up to 50 ids per call.
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url =
      `${ENTITY_API}?action=wbgetentities&ids=${batch.join('|')}` +
      `&props=claims|labels|descriptions|sitelinks&languages=en&format=json&origin=*`;
    const res = await fetchJson<{ entities: Record<string, WdEntity> }>(url);
    if (res?.entities) Object.assign(out, res.entities);
    await sleep(350);
  }
  return out;
}

/** Fetch just English labels for a set of QIDs. */
export async function getLabels(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return {};
  const out: Record<string, string> = {};
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const url =
      `${ENTITY_API}?action=wbgetentities&ids=${batch.join('|')}` +
      `&props=labels&languages=en&format=json&origin=*`;
    const res = await fetchJson<{ entities: Record<string, WdEntity> }>(url);
    for (const [id, ent] of Object.entries(res?.entities ?? {})) {
      const label = ent.labels?.en?.value;
      if (label) out[id] = label;
    }
    await sleep(350);
  }
  return out;
}

// — claim accessors —
export function claimItemIds(entity: WdEntity, prop: string): string[] {
  return (entity.claims?.[prop] ?? [])
    .map((c) => c?.mainsnak?.datavalue?.value?.id)
    .filter((x): x is string => typeof x === 'string');
}
export function claimStrings(entity: WdEntity, prop: string): string[] {
  return (entity.claims?.[prop] ?? [])
    .map((c) => c?.mainsnak?.datavalue?.value)
    .filter((v): v is string => typeof v === 'string');
}
export function claimYear(entity: WdEntity, prop: string): string | null {
  const t = entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.time as string | undefined;
  if (!t) return null;
  const m = t.match(/^([+-])(\d+)-/);
  if (!m) return null;
  const year = parseInt(m[2], 10);
  return m[1] === '-' ? `${year} BCE` : String(year);
}

/** Run a SPARQL query (returns the bindings array). */
export async function sparql(query: string): Promise<any[]> {
  const url = `${SPARQL}?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetchJson<{ results: { bindings: any[] } }>(url, { timeoutMs: 25000 });
  return res?.results?.bindings ?? [];
}

/**
 * Find the Wikidata QID for a museum object by its accession (inventory) number
 * within that museum's collection. Best-effort — returns null if no clean match.
 */
export async function findArtworkQid(accession: string, museumQid: string): Promise<string | null> {
  if (!accession || !museumQid) return null;
  const q = `SELECT ?item WHERE {
    ?item wdt:P195 wd:${museumQid} ; wdt:P217 ?inv .
    FILTER(LCASE(STR(?inv)) = LCASE("${accession.replace(/"/g, '')}"))
  } LIMIT 1`;
  try {
    const rows = await sparql(q);
    const uri = rows[0]?.item?.value as string | undefined;
    return qidFromUrl(uri);
  } catch {
    return null;
  }
}
