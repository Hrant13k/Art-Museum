import type { Category } from '@/types/artwork';

// Explore categories. `match` values are tested against an artwork's
// movement (slugified) and tags. "random" and "all" are handled specially.
export const CATEGORIES: Category[] = [
  { id: 'all', label: 'All Works', match: [] },
  { id: 'random', label: 'Random', match: [] },
  { id: 'renaissance', label: 'Renaissance', match: ['renaissance'] },
  { id: 'baroque', label: 'Baroque', match: ['baroque'] },
  { id: 'romanticism', label: 'Romanticism', match: ['romanticism'] },
  { id: 'impressionism', label: 'Impressionism', match: ['impressionism'] },
  { id: 'post-impressionism', label: 'Post-Impressionism', match: ['post-impressionism'] },
  { id: 'modernism', label: 'Modernism', match: ['modernism', 'cubism'] },
  { id: 'japanese', label: 'Japanese Art', match: ['japanese', 'japanese-art', 'ukiyo-e'] },
  { id: 'armenian', label: 'Armenian Art', match: ['armenian', 'armenian-art'] },
  { id: 'sculpture', label: 'Sculpture', match: ['sculpture'] },
  { id: 'photography', label: 'Photography', match: ['photography'] },
  { id: 'ancient', label: 'Ancient & Classical', match: ['ancient', 'classical', 'egyptian'] },
  { id: 'asian', label: 'Asian Art', match: ['chinese', 'chinese-art', 'islamic'] },
];

export function categoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
