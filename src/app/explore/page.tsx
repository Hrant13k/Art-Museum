'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { artworksInCategory } from '@/lib/db';
import { ArtworkGrid } from '@/components/ArtworkCard';
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
  const [seed, setSeed] = useState(0); // re-shuffle trigger for "Random"

  const category = CATEGORIES.find((c) => c.id === activeId)!;

  const results = useMemo(() => {
    const base = artworksInCategory(category);
    return category.id === 'random' ? shuffle(base) : base;
    // `seed` intentionally re-runs the shuffle when Random is re-tapped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, seed]);

  // Only show categories that actually contain works.
  const visibleCategories = CATEGORIES.filter(
    (c) => c.id === 'all' || c.id === 'random' || artworksInCategory(c).length > 0,
  );

  return (
    <div>
      <PageHeader eyebrow="The Collection" title="Explore" />

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5 pb-4">
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
              className={`tap-clear whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors ${
                active
                  ? 'border-ink bg-ink text-paper'
                  : 'border-ink/15 bg-transparent text-ink-soft hover:border-ink/30'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="px-5 pb-8">
        <p className="mb-5 text-xs text-ink-ghost">
          {results.length} {results.length === 1 ? 'work' : 'works'}
        </p>
        <ArtworkGrid artworks={results} />
      </div>
    </div>
  );
}
