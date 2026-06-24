'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Artwork } from '@/types/artwork';
import { dailyArtwork, todayLabel } from '@/lib/daily';
import { ArtworkImage } from './ArtworkImage';
import { FavoriteButton } from './FavoriteButton';
import { ChevronIcon } from './icons';

export function HomeDaily() {
  // Computed on the client so the selection reflects the user's current day.
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [label, setLabel] = useState('');

  useEffect(() => {
    setArtwork(dailyArtwork());
    setLabel(todayLabel());
  }, []);

  if (!artwork) {
    return (
      <div className="px-5 pt-16">
        <div className="mx-auto aspect-[3/4] w-full max-w-sm animate-pulse rounded-xl bg-paper-deep" />
      </div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="px-5 pt-8"
    >
      <header className="mb-5 flex items-baseline justify-between">
        <p className="text-[0.7rem] uppercase tracking-widest text-ink-faint">Artwork of the Day</p>
        <p className="text-[0.7rem] text-ink-ghost">{label}</p>
      </header>

      <Link
        href={`/artwork/${artwork.id}`}
        aria-label={`Open ${artwork.title}`}
        className="tap-clear block"
      >
        <div className="overflow-hidden rounded-xl bg-paper-deep shadow-[0_10px_40px_-12px_rgba(28,26,23,0.35)]">
          <ArtworkImage
            src={artwork.thumbnail}
            alt={artwork.title}
            priority
            fit="cover"
            className="max-h-[62vh] min-h-[40vh] w-full"
          />
        </div>
      </Link>

      <div className="mt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl leading-tight text-ink">{artwork.title}</h1>
            <p className="mt-1 text-ink-soft">
              <Link href={`/artist/${artwork.artistId}`} className="underline-offset-2 hover:underline">
                {artwork.artist}
              </Link>
              {artwork.year && artwork.year !== 'Date unknown' ? `, ${artwork.year}` : ''}
            </p>
          </div>
          <FavoriteButton artworkId={artwork.id} className="-mr-2 shrink-0" />
        </div>

        <Link
          href={`/museum/${artwork.museumId}`}
          className="mt-1 inline-block text-sm text-ink-faint underline-offset-2 hover:underline"
        >
          {artwork.museum}
        </Link>

        <p className="mt-4 max-w-reading text-[0.98rem] leading-relaxed text-ink-soft">
          {artwork.overview}
        </p>

        <Link
          href={`/artwork/${artwork.id}`}
          className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent"
        >
          Read more & explore
          <ChevronIcon className="text-[1rem]" />
        </Link>
      </div>

      <Link
        href="/explore"
        className="mt-12 mb-4 block border-t border-ink/10 pt-5 text-sm text-ink-faint"
      >
        Browse the whole collection →
      </Link>
    </motion.article>
  );
}
