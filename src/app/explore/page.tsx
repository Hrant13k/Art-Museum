'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CATEGORIES } from '@/lib/categories';
import { artworksInCategory } from '@/lib/db';
import { ArtworkGrid } from '@/components/ArtworkCard';
import { ArtworkImage } from '@/components/ArtworkImage';
import { PageHeader } from '@/components/PageHeader';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ExplorePage() {
  const [activeId, setActiveId] = useState('all');
  const [seed, setSeed] = useState(0);

  const category = CATEGORIES.find((c) => c.id === activeId)!;

  const results = useMemo(() => {
    const base = artworksInCategory(category);
    return category.id === 'random' ? shuffle(base) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, seed]);

  const visibleCategories = CATEGORIES.filter(
    (c) => c.id === 'all' || c.id === 'random' || artworksInCategory(c).length > 0,
  );

  // A representative work backs the featured hero for the active category.
  const hero = results[0];
  const heroTitle = category.id === 'all' ? 'The Collection' : category.label;

  return (
    <div>
      <PageHeader eyebrow="Browse" title="Explore" />

      {/* Featured collection hero */}
      {hero && (
        <div className="px-6 pt-4">
          <Link href={`/artwork/${hero.id}`} className="tap-clear block">
            <div className="art-frame relative aspect-[16/10] w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={hero.id}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  <ArtworkImage src={hero.thumbnail} alt={hero.title} priority fit="cover" className="h-full w-full" />
                </motion.div>
              </AnimatePresence>
              <div className="pointer-events-none absolute inset-0 scrim-b" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="eyebrow text-gilt/90">Collection</p>
                <h2 className="mt-1.5 font-serif text-[1.9rem] font-light leading-none tracking-tight text-linen">
                  {heroTitle}
                </h2>
                <p className="mt-2 text-xs text-linen-dim">
                  {results.length} {results.length === 1 ? 'work' : 'works'}
                </p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Category chips */}
      <div className="no-scrollbar mt-6 flex gap-2.5 overflow-x-auto px-6 pb-5">
        {visibleCategories.map((c) => {
          const active = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setActiveId(c.id);
                if (c.id === 'random') setSeed((s) => s + 1);
              }}
              aria-pressed={active}
              className={`tap-clear whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors ${
                active
                  ? 'bg-linen font-medium text-gallery'
                  : 'text-linen-dim ring-1 ring-white/10 hover:text-linen hover:ring-white/20'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="px-6 pb-10 pt-2">
        <ArtworkGrid artworks={results} />
      </div>
    </div>
  );
}
