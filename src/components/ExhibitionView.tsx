'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { categoryById } from '@/lib/categories';
import { artworksInCategory } from '@/lib/db';
import { ArtworkGrid } from '@/components/ArtworkCard';
import { ArrowLeftIcon, ShuffleIcon, HeartIcon } from '@/components/icons';

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

  // A special, not-yet-filled collection — show a gentle invitation instead.
  if (category.comingSoon) return <ComingSoon title={title} />;

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

/** A tender placeholder for a collection that hasn't been curated yet. */
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="px-6">
      <header className="safe-top pb-2 pt-8">
        <Link
          href="/explore"
          className="tap-clear -ml-1 inline-flex items-center gap-1.5 text-sm text-linen-dim transition-colors hover:text-linen"
        >
          <ArrowLeftIcon className="text-[1.05rem]" />
          Explore
        </Link>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mt-[14vh] max-w-sm overflow-hidden rounded-[1.5rem] p-9 text-center ring-1 ring-[#e9d4dc] shadow-[0_24px_70px_-24px_rgba(207,125,156,0.5)]"
        style={{ background: 'linear-gradient(150deg, #fcf9f4 0%, #f6eee7 55%, #f3e6ec 100%)' }}
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#cf7d9c]/12 text-[1.6rem] text-[#d98ba6] ring-1 ring-[#e7cdd6]">
          <HeartIcon filled />
        </span>
        <p className="mt-6 text-[0.62rem] font-medium uppercase tracking-[0.28em] text-[#cf7d9c]">
          Coming soon
        </p>
        <h1 className="mt-3 font-serif text-[1.9rem] font-light leading-[1.1] tracking-tight text-[#4a4039]">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-[24ch] text-[0.95rem] leading-relaxed text-[#8a7d74]">
          A collection of favourites, hand-picked with care. These walls are being
          prepared — please check back soon.
        </p>
        <div className="mx-auto mt-7 h-px w-12 bg-[#e1c2cd]" />
        <p className="mt-4 text-[0.6rem] uppercase tracking-[0.3em] text-[#b9a59b]">Reserved · With love</p>
      </motion.div>
    </div>
  );
}
