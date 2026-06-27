// The artist roster for the Wikidata-driven collection pass. Each artist's most
// famous works (those with a freely-licensed image) are pulled from Wikidata +
// Wikimedia Commons. QIDs are resolved by name at build time, so only the names
// are listed here. `alt` provides a fallback spelling when the primary label
// doesn't resolve.

export interface ArtistSeed {
  name: string;
  alt?: string; // alternate spelling, tried if the name doesn't resolve
  tags?: string[]; // extra Explore tags (e.g. 'armenian')
}

// How many works to pull per artist (most-famous-first). Tunable.
export const PER_ARTIST_LIMIT = Number(process.env.PER_ARTIST_LIMIT) || 14;

export const PRIORITY_ARTISTS: ArtistSeed[] = [
  { name: 'Hieronymus Bosch' },
  { name: 'Gustav Klimt' },
  { name: 'Vincent van Gogh' },
  { name: 'Claude Monet' },
  { name: 'Pierre-Auguste Renoir' },
  { name: 'Titian' },
  { name: 'Rembrandt', alt: 'Rembrandt van Rijn' },
  { name: 'Johannes Vermeer' },
  { name: 'Caravaggio' },
  { name: 'Leonardo da Vinci' },
  { name: 'Michelangelo' },
  { name: 'Raphael' },
  { name: 'Sandro Botticelli' },
  { name: 'Francisco Goya', alt: 'Francisco de Goya' },
  { name: 'J. M. W. Turner', alt: 'Joseph Mallord William Turner' },
  { name: 'Caspar David Friedrich' },
  { name: 'Edvard Munch' },
  { name: 'Salvador Dalí' },
  { name: 'Pablo Picasso' },
  { name: 'Henri Matisse' },
  { name: 'Paul Cézanne' },
  { name: 'Edgar Degas' },
  { name: 'Henri de Toulouse-Lautrec' },
  { name: 'Katsushika Hokusai' },
  { name: 'Albrecht Dürer' },
  { name: 'El Greco' },
  { name: 'Diego Velázquez' },
  { name: 'Wassily Kandinsky' },
];

export const ARMENIAN_ARTISTS: ArtistSeed[] = [
  { name: 'Ivan Aivazovsky', alt: 'Hovhannes Aivazovsky', tags: ['armenian'] },
  { name: 'Martiros Saryan', tags: ['armenian'] },
  { name: 'Arshile Gorky', tags: ['armenian'] },
  { name: 'Minas Avetisyan', tags: ['armenian'] },
  { name: 'Hakob Hovnatanian', alt: 'Hakob Hovnatanyan', tags: ['armenian'] },
  { name: 'Vardges Sureniants', tags: ['armenian'] },
  { name: 'Panos Terlemezian', alt: 'Panos Terlemezyan', tags: ['armenian'] },
  { name: 'Gevorg Bashinjaghian', tags: ['armenian'] },
  { name: 'Yeghishe Tadevosyan', tags: ['armenian'] },
  // Additional historically important Armenian painters:
  { name: 'Stepanos Nersisian', alt: 'Stepanos Nersissian', tags: ['armenian'] },
  { name: 'Yervand Kochar', tags: ['armenian'] },
  { name: 'Gevorg Grigoryan', alt: 'Giotto', tags: ['armenian'] },
  { name: 'Mariam Aslamazian', tags: ['armenian'] },
  { name: 'Hovsep Pushman', tags: ['armenian'] },
];

// Armenian artists first so the expansion is never truncated by the size cap.
export const ALL_ARTISTS: ArtistSeed[] = [...ARMENIAN_ARTISTS, ...PRIORITY_ARTISTS];
