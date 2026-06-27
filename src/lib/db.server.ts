// Server-/build-only data access. This imports the FULL artworks.json (heavy
// detail included) and must only be imported by server components, so the large
// file is read at build time and never shipped to the client bundle. Used to
// pass the entry artwork's detail straight into the statically rendered page.
import artworksData from '../../data/artworks.json';
import type { Artwork, ArtworkDetail } from '@/types/artwork';

const all = artworksData as unknown as Artwork[];
const byId = new Map(all.map((a) => [a.id, a]));

/** The heavy, detail-only fields for one artwork, or null if unknown. */
export function getArtworkDetail(id: string): ArtworkDetail | null {
  const a = byId.get(id);
  if (!a) return null;
  return {
    creationStory: a.creationStory ?? '',
    whoIsDepicted: a.whoIsDepicted ?? '',
    historicalContext: a.historicalContext ?? '',
    interestingFacts: a.interestingFacts ?? [],
    sourceLinks: a.sourceLinks ?? [],
    depicts: a.depicts,
    provenance: a.provenance,
  };
}
