// Wikimedia Commons image resolution. Images carry per-file licenses, so we
// always read the file's license + attribution and store them with the artwork.
import { fetchJson } from '../lib/util.js';

const API = 'https://commons.wikimedia.org/w/api.php';

export interface CommonsImage {
  file: string; // Commons filename (without the "File:" prefix)
  thumb: string; // ~1200px display image (via Special:FilePath, always resolves)
  original: string;
  license: string;
  attribution: string | null;
}

/**
 * Build a stable, correctly-sized Commons image URL. Special:FilePath redirects
 * to a valid generated thumbnail size (capped at the original), which avoids the
 * "invalid thumbnail width" 400s you get from hand-built /thumb/ URLs.
 */
export function commonsUrl(filename: string, width: number): string {
  const f = encodeURIComponent(filename.replace(/^File:/i, '').replace(/ /g, '_'));
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${f}?width=${width}`;
}

// Licenses we are willing to store + redistribute for an offline app.
const ALLOWED = /^(cc0|public domain|pd|cc.?by(-sa)?)/i;

function stripHtml(s: string | undefined): string | null {
  if (!s) return null;
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || null;
}

/** Resolve a Commons file (e.g. "Vincent van Gogh - Irises.jpg") to a usable image. */
export async function resolveCommonsImage(filename: string): Promise<CommonsImage | null> {
  if (!filename) return null;
  const title = `File:${filename.replace(/^File:/i, '')}`;
  const url =
    `${API}?action=query&format=json&origin=*&prop=imageinfo` +
    `&iiprop=url|extmetadata&iiurlwidth=1200&titles=${encodeURIComponent(title)}`;
  const res = await fetchJson<any>(url);
  const pages = res?.query?.pages;
  if (!pages) return null;
  const page: any = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;

  const meta = info.extmetadata ?? {};
  let license =
    stripHtml(meta.LicenseShortName?.value) ||
    stripHtml(meta.License?.value) ||
    'Unknown';
  if (!ALLOWED.test(license)) return null; // skip anything we can't legally store
  if (/^public domain$/i.test(license)) license = 'Public Domain'; // normalize casing

  const attribution =
    stripHtml(meta.Attribution?.value) ||
    stripHtml(meta.Artist?.value) ||
    null;

  const file = title.replace(/^File:/i, '');
  return {
    file,
    thumb: commonsUrl(file, 1200),
    original: info.url,
    license,
    attribution,
  };
}
