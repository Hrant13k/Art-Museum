// Curated cover art for each Explore exhibition ticket.
//
// Each entry pins a specific, recognizable work as the ticket face and gives it a
// focal-point crop (CSS object-position) so the subject — a face, a horizon, a
// sculpture — sits well inside the wide ticket window rather than being sliced by
// a naive center crop. Anything not listed here falls back to the deterministic
// pick in the Explore page.
//
// `zoom` scales the image past the frame to crop away a paper/mount border baked
// into the source scan (common for prints and photographs) — object-position
// alone can only shift the crop, not tighten it.
export type Cover = { id: string; position?: string; zoom?: number };

export const COVERS: Record<string, Cover> = {
  all: { id: 'wikidata-Q12418', position: 'center 30%' }, // Mona Lisa
  random: { id: 'wikidata-Q1025704' }, // Café Terrace at Night
  ancient: { id: 'met-251929', position: 'center 18%' }, // Wounded warrior
  renaissance: { id: 'wikidata-Q151047' }, // The Birth of Venus
  'dutch-golden-age': { id: 'wikidata-Q219831' }, // The Night Watch
  baroque: { id: 'wikidata-Q2610675' }, // The Fortune Teller
  romanticism: { id: 'wikidata-Q257580' }, // The Fighting Temeraire
  realism: { id: 'met-436544', position: '60% 22%', zoom: 1.25 }, // Tiburcio Pérez (Goya) — frame + dark margin
  impressionism: { id: 'wikidata-Q328523' }, // Impression, Sunrise
  'post-impressionism': { id: 'wikidata-Q45585', position: 'center 45%' }, // The Starry Night
  symbolism: { id: 'wikidata-Q698487', position: 'center 14%' }, // The Kiss (Klimt) — keep the faces in frame
  modern: { id: 'wikidata-Q471379', position: 'center 42%' }, // The Scream
  surrealism: { id: 'wikidata-Q17986845' }, // Mae West Lips Sofa (Dalí)
  japanese: { id: 'met-39799', zoom: 1.26 }, // The Great Wave off Kanagawa (paper border)
  armenian: { id: 'wikidata-Q1070896' }, // The Ninth Wave (Aivazovsky)
  asian: { id: 'cma-132837', zoom: 1.3 }, // Album of Seasonal Landscapes (paper border)
  portraits: { id: 'met-436532', position: 'center 22%' }, // Van Gogh, Self-Portrait with a Straw Hat
  landscapes: { id: 'met-436535', position: 'center 40%', zoom: 1.15 }, // Wheat Field with Cypresses (frame border)
  sacred: { id: 'wikidata-Q128910' }, // The Last Supper
  sculpture: { id: 'wikidata-Q179900', position: 'center 10%' }, // David (Michelangelo)
  print: { id: 'wikidata-Q17227585', position: 'center 38%', zoom: 1.15 }, // Kajikazawa in Kai province (thin border)
  photography: { id: 'met-262612', position: 'center 40%', zoom: 1.2 }, // View on the Columbia (mount border)
};
