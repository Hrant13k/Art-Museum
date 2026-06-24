// Curation plan for the seed collection.
// Each entry fetches a few works and tags them with a movement so the Explore
// categories are well populated even when a source omits style metadata.
// Increase `limit` values (and add entries) to scale toward 1000 artworks.
//
// Sources are limited to the Met and Cleveland: both serve images that load
// cross-origin without hotlink protection, so every artwork displays reliably
// inside the PWA. (The Art Institute of Chicago API is excellent for metadata
// but its images sit behind Cloudflare hotlink protection.)

export type Source = 'met' | 'aic' | 'cma';

export interface FetchPlan {
  source: Source;
  query: string;
  limit: number;
  movement: string;
  tags: string[];
}

// Target ceiling after de-duplication. Raise this to scale the collection.
// Override per-run with TARGET_SIZE=40 npm run data:collect
export const TARGET_SIZE = Number(process.env.TARGET_SIZE) || 120;

export const PLANS: FetchPlan[] = [
  // — Renaissance —
  { source: 'met', query: 'Botticelli', limit: 2, movement: 'Renaissance', tags: ['renaissance'] },
  { source: 'met', query: 'Raphael', limit: 2, movement: 'Renaissance', tags: ['renaissance'] },
  { source: 'met', query: 'Albrecht Dürer', limit: 3, movement: 'Renaissance', tags: ['renaissance', 'print'] },
  { source: 'met', query: 'Titian', limit: 3, movement: 'Renaissance', tags: ['renaissance'] },

  // — Baroque —
  { source: 'met', query: 'Rembrandt', limit: 5, movement: 'Baroque', tags: ['baroque', 'painting'] },
  { source: 'met', query: 'Johannes Vermeer', limit: 2, movement: 'Baroque', tags: ['baroque'] },
  { source: 'met', query: 'Peter Paul Rubens', limit: 3, movement: 'Baroque', tags: ['baroque'] },
  { source: 'cma', query: 'Baroque painting', limit: 3, movement: 'Baroque', tags: ['baroque'] },

  // — Romanticism —
  { source: 'met', query: 'Eugène Delacroix', limit: 3, movement: 'Romanticism', tags: ['romanticism'] },
  { source: 'met', query: 'Francisco Goya', limit: 3, movement: 'Romanticism', tags: ['romanticism'] },
  { source: 'met', query: 'Joseph Mallord William Turner', limit: 2, movement: 'Romanticism', tags: ['romanticism', 'landscape'] },

  // — Impressionism —
  { source: 'met', query: 'Claude Monet', limit: 6, movement: 'Impressionism', tags: ['impressionism', 'landscape'] },
  { source: 'met', query: 'Auguste Renoir', limit: 3, movement: 'Impressionism', tags: ['impressionism'] },
  { source: 'met', query: 'Edgar Degas', limit: 4, movement: 'Impressionism', tags: ['impressionism'] },
  { source: 'met', query: 'Camille Pissarro', limit: 2, movement: 'Impressionism', tags: ['impressionism'] },

  // — Post-Impressionism —
  { source: 'met', query: 'Vincent van Gogh', limit: 6, movement: 'Post-Impressionism', tags: ['post-impressionism'] },
  { source: 'met', query: 'Paul Cézanne', limit: 4, movement: 'Post-Impressionism', tags: ['post-impressionism'] },
  { source: 'met', query: 'Georges Seurat', limit: 2, movement: 'Post-Impressionism', tags: ['post-impressionism'] },
  { source: 'met', query: 'Paul Gauguin', limit: 3, movement: 'Post-Impressionism', tags: ['post-impressionism'] },

  // — Modernism —
  { source: 'met', query: 'Pablo Picasso', limit: 4, movement: 'Modernism', tags: ['modernism', 'cubism'] },
  { source: 'met', query: 'Henri Matisse', limit: 3, movement: 'Modernism', tags: ['modernism'] },
  { source: 'met', query: 'Gustav Klimt', limit: 1, movement: 'Modernism', tags: ['modernism'] },
  { source: 'met', query: 'Amedeo Modigliani', limit: 2, movement: 'Modernism', tags: ['modernism'] },

  // — Japanese Art —
  { source: 'met', query: 'Katsushika Hokusai', limit: 4, movement: 'Japanese Art', tags: ['japanese', 'ukiyo-e', 'print'] },
  { source: 'met', query: 'Utagawa Hiroshige', limit: 4, movement: 'Japanese Art', tags: ['japanese', 'ukiyo-e', 'print'] },
  { source: 'met', query: 'Kitagawa Utamaro', limit: 2, movement: 'Japanese Art', tags: ['japanese', 'ukiyo-e', 'print'] },

  // — Armenian Art —
  { source: 'met', query: 'Armenian', limit: 4, movement: 'Armenian Art', tags: ['armenian'] },
  { source: 'cma', query: 'Armenian', limit: 3, movement: 'Armenian Art', tags: ['armenian'] },

  // — Sculpture —
  { source: 'met', query: 'Auguste Rodin', limit: 3, movement: 'Modernism', tags: ['sculpture'] },
  { source: 'met', query: 'marble statue', limit: 4, movement: 'Classical', tags: ['sculpture', 'ancient'] },

  // — Photography (Cleveland open access; the Met's photos are mostly in-copyright) —
  { source: 'cma', query: 'photograph portrait', limit: 4, movement: 'Photography', tags: ['photography'] },
  { source: 'cma', query: 'photograph landscape', limit: 3, movement: 'Photography', tags: ['photography'] },
  { source: 'met', query: 'Carleton Watkins photograph', limit: 2, movement: 'Photography', tags: ['photography'] },

  // — Art Institute of Chicago (metadata-rich; images resolved via Wikimedia Commons) —
  { source: 'aic', query: 'Claude Monet', limit: 3, movement: 'Impressionism', tags: ['impressionism'] },
  { source: 'aic', query: 'Georges Seurat', limit: 2, movement: 'Post-Impressionism', tags: ['post-impressionism'] },
  { source: 'aic', query: 'Gustave Caillebotte', limit: 2, movement: 'Impressionism', tags: ['impressionism'] },
  { source: 'aic', query: 'Vincent van Gogh', limit: 2, movement: 'Post-Impressionism', tags: ['post-impressionism'] },

  // — Cross-cultural breadth —
  { source: 'met', query: 'Egyptian sculpture', limit: 3, movement: 'Ancient', tags: ['ancient', 'egyptian'] },
  { source: 'met', query: 'Islamic calligraphy', limit: 3, movement: 'Islamic', tags: ['islamic'] },
  { source: 'cma', query: 'Chinese landscape painting', limit: 3, movement: 'Chinese Art', tags: ['chinese'] },
  { source: 'met', query: 'Mary Cassatt', limit: 2, movement: 'Impressionism', tags: ['impressionism', 'american'] },
];
