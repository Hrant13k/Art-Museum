'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { categoryById } from '@/lib/categories';
import { artworksInCategory } from '@/lib/db';
import { ArtworkGrid } from '@/components/ArtworkCard';
import { ArrowLeftIcon, ShuffleIcon } from '@/components/icons';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const OVERRIDE: Record<string, string> = {
  all: 'The Complete Collection',
  random: 'Random Discoveries',
};

export function ExhibitionView({ categoryId }: { categoryId: string }) {
  const category = categoryById(categoryId)!;
  const [seed, setSeed] = useState(0);

  const results = useMemo(() => {
    const base = artworksInCategory(category);
    return category.id === 'random' ? shuffle(base) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, seed]);

  const title = OVERRIDE[category.id] ?? category.label;

  return (
    <div>
      {/* Entrance: the exhibition title arrives, then the works fade up. */}
      <header className="safe-top px-6 pb-2 pt-8">
        <Link
          href="/explore"
          className="tap-clear -ml-1 mb-5 inline-flex items-center gap-1.5 text-sm text-linen-dim transition-colors hover:text-linen"
        >
          <ArrowLeftIcon className="text-[1.05rem]" />
          Explore
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="eyebrow mb-2 text-gilt/90">Exhibition</p>
          <div className="flex items-end justify-between gap-4">
            <h1 className="font-serif text-[2.3rem] font-light leading-[1.05] tracking-tight text-linen">
              {title}
            </h1>
            {category.id === 'random' && (
              <button
                type="button"
                onClick={() => setSeed((s) => s + 1)}
                aria-label="Shuffle"
                className="tap-clear mb-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[1.1rem] text-linen-dim ring-1 ring-white/10 transition-colors hover:text-linen hover:ring-white/20"
              >
                <ShuffleIcon />
              </button>
            )}
          </div>
          <p className="mt-2.5 text-sm text-linen-dim">
            {results.length} {results.length === 1 ? 'work' : 'works'}
          </p>
        </motion.div>
      </header>

      <motion.div
        key={seed}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="px-6 pb-12 pt-6"
      >
        <ArtworkGrid artworks={results} />
      </motion.div>
    </div>
  );
}
