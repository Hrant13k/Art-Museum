import type { Category } from '@/types/artwork';

// Explore categories. `match` values are tested against an artwork's
// movement (slugified) and tags. "all" and "random" are handled specially.
// Categories that end up with no works are hidden automatically by the page,
// so it's safe to list aspirational ones here.
export const CATEGORIES: Category[] = [
  { id: 'all', label: 'All Works', match: [] },
  { id: 'random', label: 'Random', match: [] },

  // — Movements & periods (chronological-ish) —
  { id: 'ancient', label: 'Ancient & Classical', match: ['ancient', 'classical', 'classicism', 'egyptian', 'classical-antiquity'] },
  {
    id: 'renaissance',
    label: 'Renaissance',
    match: [
      'renaissance', 'early-renaissance', 'high-renaissance', 'italian-renaissance',
      'italian-renaissance-painting', 'florentine-renaissance-art', 'venetian-school',
      'northern-renaissance', 'german-renaissance', 'early-netherlandish-painting',
      'renaissance-humanism', 'mannerism',
    ],
  },
  { id: 'dutch-golden-age', label: 'Dutch Golden Age', match: ['dutch-golden-age-painting'] },
  { id: 'baroque', label: 'Baroque', match: ['baroque', 'italian-baroque-painting', 'flemish-baroque-painting'] },
  { id: 'romanticism', label: 'Romanticism', match: ['romanticism', 'german-romanticism'] },
  { id: 'realism', label: 'Realism', match: ['realism', 'naturalism', 'academic-art', 'barbizon-school'] },
  { id: 'impressionism', label: 'Impressionism', match: ['impressionism', 'neo-impressionism'] },
  { id: 'post-impressionism', label: 'Post-Impressionism', match: ['post-impressionism', 'pointillism', 'cloisonnism', 'synthetism'] },
  { id: 'symbolism', label: 'Symbolism & Art Nouveau', match: ['symbolism', 'art-nouveau', 'vienna-secession', 'les-nabis'] },
  { id: 'modern', label: 'Modern', match: ['modernism', 'modern-art', 'cubism', 'fauvism', 'expressionism', 'abstract-expressionism', 'futurism', 'suprematism', 'abstract-art'] },
  { id: 'surrealism', label: 'Surrealism', match: ['surrealism'] },

  // — Cultures —
  { id: 'japanese', label: 'Japanese Art', match: ['japanese', 'japanese-art', 'ukiyo-e'] },
  { id: 'armenian', label: 'Armenian Art', match: ['armenian', 'armenian-art'] },
  { id: 'asian', label: 'Asian & Islamic', match: ['chinese', 'chinese-art', 'islamic', 'persian'] },

  // — Themes —
  { id: 'portraits', label: 'Portraits', match: ['portrait', 'self-portrait'] },
  { id: 'landscapes', label: 'Landscapes', match: ['landscape', 'landscape-painting', 'marine-art', 'seascape', 'veduta'] },
  { id: 'sacred', label: 'Sacred & Myth', match: ['religious-art', 'mary', 'jesus-christ', 'christ-child', 'angel', 'madonna', 'venus', 'mythology'] },

  // — Mediums —
  { id: 'sculpture', label: 'Sculpture', match: ['sculpture'] },
  { id: 'print', label: 'Prints', match: ['print', 'prints', 'woodblock-print'] },
  { id: 'photography', label: 'Photography', match: ['photography'] },
];

export function categoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
