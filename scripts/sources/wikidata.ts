// High-level Wikidata enrichment. Returns CC0 structured facts for an artwork
// and (if linked) its creator, ready to merge into our dataset.
import {
  getEntities,
  getLabels,
  claimItemIds,
  claimStrings,
  claimYear,
  type WdEntity,
} from '../lib/wikidata.js';

export interface WdArtworkFacts {
  movement: string | null;
  genre: string | null;
  depicts: string[];
  inceptionYear: string | null;
  commonsFile: string | null;
  creatorQid: string | null;
}

export interface WdArtistFacts {
  qid: string;
  birthYear: string | null;
  deathYear: string | null;
  nationality: string | null;
  movement: string | null;
  bio: string | null; // Wikidata description (CC0)
  enwikiUrl: string | null;
}

export interface WdEnrichment {
  artwork: WdArtworkFacts;
  artist: WdArtistFacts | null;
}

function first(map: Record<string, string>, ids: string[]): string | null {
  for (const id of ids) if (map[id]) return map[id];
  return null;
}

export async function enrichFromWikidata(artworkQid: string): Promise<WdEnrichment | null> {
  const ents = await getEntities([artworkQid]);
  const art = ents[artworkQid];
  if (!art) return null;

  const movementIds = claimItemIds(art, 'P135');
  const genreIds = claimItemIds(art, 'P136');
  const depictsIds = claimItemIds(art, 'P180').slice(0, 8);
  const creatorQid = claimItemIds(art, 'P170')[0] ?? null;
  const commonsFile = claimStrings(art, 'P18')[0] ?? null;
  const inceptionYear = claimYear(art, 'P571');

  // Pull the creator entity too, for artist facts.
  let creator: WdEntity | undefined;
  if (creatorQid) {
    const cEnts = await getEntities([creatorQid]);
    creator = cEnts[creatorQid];
  }

  const artistNationalityIds = creator ? claimItemIds(creator, 'P27') : [];
  const artistMovementIds = creator ? claimItemIds(creator, 'P135') : [];

  // One batched label lookup for every referenced QID.
  const labels = await getLabels([
    ...movementIds,
    ...genreIds,
    ...depictsIds,
    ...artistNationalityIds,
    ...artistMovementIds,
  ]);

  const artwork: WdArtworkFacts = {
    movement: first(labels, movementIds),
    genre: first(labels, genreIds),
    depicts: depictsIds.map((id) => labels[id]).filter(Boolean),
    inceptionYear,
    commonsFile,
    creatorQid,
  };

  let artist: WdArtistFacts | null = null;
  if (creator && creatorQid) {
    artist = {
      qid: creatorQid,
      birthYear: claimYear(creator, 'P569'),
      deathYear: claimYear(creator, 'P570'),
      nationality: first(labels, artistNationalityIds),
      movement: first(labels, artistMovementIds),
      bio: creator.descriptions?.en?.value ?? null,
      enwikiUrl: creator.sitelinks?.enwiki
        ? `https://en.wikipedia.org/wiki/${encodeURIComponent(creator.sitelinks.enwiki.title.replace(/ /g, '_'))}`
        : null,
    };
  }

  return { artwork, artist };
}
