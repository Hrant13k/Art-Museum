// Shared domain types. Imported by both the data scripts and the app.

/** A block of enriched, human-readable content about an artwork. */
export interface EnrichedContent {
  /** 2-3 sentence plain-language introduction. */
  overview: string;
  /** How and why the work was created. */
  creationStory: string;
  /** Who or what is depicted, and why it matters. */
  whoIsDepicted: string;
  /** The historical / cultural moment around the work. */
  historicalContext: string;
  /** A few short, surprising-but-factual notes. */
  interestingFacts: string[];
}

/** Marks which enriched fields are genuinely sourced vs. unavailable. */
export type EnrichmentStatus = 'enriched' | 'metadata-fallback' | 'unavailable';

export interface SourceLink {
  label: string;
  url: string;
}

/**
 * The heavy, detail-only fields of an artwork. These are read solely by the
 * expanded artwork viewer, so they are kept out of the bundled light index and
 * loaded separately (see lib/details.ts). Splitting them out keeps the data
 * that every page parses on first load small.
 */
export interface ArtworkDetail {
  creationStory: string;
  whoIsDepicted: string;
  historicalContext: string;
  interestingFacts: string[];
  sourceLinks: SourceLink[];
  depicts?: string[];
  provenance?: Record<string, string>;
}

export interface Artwork extends EnrichedContent {
  /** Stable internal id: `${source}-${sourceId}`. */
  id: string;
  source: string; // e.g. "met", "aic", "cma"
  sourceId: string;

  title: string;
  artist: string;
  artistId: string; // slug, links to an Artist
  year: string; // display string, e.g. "1889" or "c. 1503-1506"
  yearValue: number | null; // numeric sort key (best-effort)

  museum: string;
  museumId: string; // slug, links to a Museum
  museumLocation: string;

  image: string; // full-size image URL
  thumbnail: string; // smaller image URL for grids/lists

  movement: string;
  medium: string;
  culture: string;
  department: string;

  /** Lowercased tags used by Explore categories and search. */
  tags: string[];

  enrichmentStatus: EnrichmentStatus;
  sourceLinks: SourceLink[];

  // — Multi-source provenance & licensing (added by the merge pipeline) —
  /** Cross-source identifiers, keyed by namespace: { wikidata, ulan, met, aic, cma }. */
  externalIds?: Record<string, string>;
  /** Where the displayed image came from, and under what terms. */
  imageSource?: string; // e.g. "met", "cma", "commons"
  imageLicense?: string; // e.g. "CC0", "Public Domain", "CC BY-SA 4.0"
  imageAttribution?: string; // required credit string, when applicable
  /** Subjects depicted, from Wikidata P180 (CC0). */
  depicts?: string[];
  /** Which source supplied each field — an audit trail. */
  provenance?: Record<string, string>;
}

export interface Artist {
  id: string; // slug
  name: string;
  portrait: string | null;
  birthYear: string | null;
  deathYear: string | null;
  nationality: string | null;
  bio: string | null;
  bioStatus: EnrichmentStatus;
  movement: string | null;
  artworkIds: string[];
  relatedArtistIds: string[];

  /** Other artists this one was influenced by (Wikidata P737). */
  influencedBy?: string[];
  /** Cross-source identifiers: { wikidata, ulan }. */
  externalIds?: Record<string, string>;
}

export interface Museum {
  id: string; // slug
  name: string;
  location: string;
  foundedYear: string | null;
  history: string | null;
  historyStatus: EnrichmentStatus;
  artworkIds: string[];
  mapUrl: string | null;
}

/** A browsable Explore category. */
export interface Category {
  id: string;
  label: string;
  /** Predicate keys matched against an artwork's tags/movement/medium. */
  match: string[];
}
