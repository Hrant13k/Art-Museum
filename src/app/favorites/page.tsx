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

      <div className="px-6 pb-10 pt-6">
        {!ready ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-md bg-gallery-raised" />
            ))}
          </div>
        ) : artworks.length === 0 ? (
          <div className="flex flex-col items-center px-6 pt-24 text-center">
            <span className="text-4xl text-linen-faint">
              <HeartIcon />
            </span>
            <p className="mt-5 font-serif text-2xl font-light text-linen">Nothing saved yet</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-linen-dim">
              Tap the mark on any artwork to keep it here. Your saved works stay on this device and
              are available offline.
            </p>
            <Link
              href="/explore"
              className="mt-7 rounded-full px-5 py-2.5 text-sm text-linen ring-1 ring-white/15 transition-colors hover:ring-white/30"
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
