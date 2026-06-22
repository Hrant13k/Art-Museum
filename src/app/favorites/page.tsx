'use client';

import Link from 'next/link';
import { useFavorites } from '@/lib/useFavorites';
import { getArtworksByIds } from '@/lib/db';
import { ArtworkGrid } from '@/components/ArtworkCard';
import { PageHeader } from '@/components/PageHeader';
import { HeartIcon } from '@/components/icons';

export default function FavoritesPage() {
  const { ids, ready } = useFavorites();
  const artworks = getArtworksByIds(ids);

  return (
    <div>
      <PageHeader eyebrow="Your collection" title="Saved">
        {ready && artworks.length > 0
          ? `${artworks.length} ${artworks.length === 1 ? 'work' : 'works'}`
          : null}
      </PageHeader>

      <div className="px-5 pb-8 pt-5">
        {!ready ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-paper-deep" />
            ))}
          </div>
        ) : artworks.length === 0 ? (
          <div className="flex flex-col items-center px-6 pt-20 text-center">
            <span className="text-4xl text-ink-ghost">
              <HeartIcon />
            </span>
            <p className="mt-4 font-serif text-xl text-ink">Nothing saved yet</p>
            <p className="mt-2 max-w-xs text-sm text-ink-faint">
              Tap the heart on any artwork to keep it here. Your saved works stay on this device and
              are available offline.
            </p>
            <Link
              href="/explore"
              className="mt-6 rounded-full border border-ink/20 px-5 py-2 text-sm text-ink hover:border-ink/40"
            >
              Explore the collection
            </Link>
          </div>
        ) : (
          <ArtworkGrid artworks={artworks} />
        )}
      </div>
    </div>
  );
}
