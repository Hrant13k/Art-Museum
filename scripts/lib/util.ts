// Shared helpers for the data-collection and enrichment scripts.

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'unknown';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch JSON with timeout + retry. Returns null on persistent failure. */
export async function fetchJson<T = any>(
  url: string,
  { retries = 4, timeoutMs = 15000 } = {},
): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ArtMuseumPWA/1.0 (educational; data collection)' },
      });
      clearTimeout(timer);
      if (res.status === 404) return null;
      // 403/429 from the Met usually means rate-limiting — back off harder.
      if (res.status === 403 || res.status === 429) throw new Error(`HTTP ${res.status} (rate-limited)`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) {
        console.warn(`  ! fetch failed (${url}): ${(err as Error).message}`);
        return null;
      }
      const rateLimited = /rate-limited/.test((err as Error).message);
      await sleep((rateLimited ? 2500 : 600) * (attempt + 1));
    }
  }
  return null;
}

/** Best-effort numeric year for sorting from a display date like "c. 1503-1506". */
export function parseYearValue(display: string | null | undefined): number | null {
  if (!display) return null;
  const bce = /b\.?c\.?e?\.?/i.test(display);
  // "14th century" / "15th century" → approximate mid-century year.
  const century = display.match(/(\d{1,2})(?:st|nd|rd|th)\s*century/i);
  if (century) {
    const c = parseInt(century[1], 10);
    const year = (c - 1) * 100 + 50;
    return bce ? -year : year;
  }
  const match = display.match(/-?\d{3,4}/) || display.match(/-?\d{1,4}/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  if (Number.isNaN(n)) return null;
  return bce ? -n : n;
}

/** Normalize a display date into a clean string. */
export function cleanYear(display: string | null | undefined): string {
  if (!display) return 'Date unknown';
  return display.replace(/\s+/g, ' ').trim();
}

export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

export function titleCase(input: string): string {
  return input.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
