'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Artwork } from '@/types/artwork';
import { dailyArtwork, todayLabel } from '@/lib/daily';
import { monogram } from '@/lib/format';
import { ArtworkImage } from './ArtworkImage';
import { FavoriteButton } from './FavoriteButton';
import { ShareButton } from './ShareButton';
import { ChevronIcon } from './icons';

export function HomeDaily() {
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [label, setLabel] = useState('');

  useEffect(() => {
    setArtwork(dailyArtwork());
    setLabel(todayLabel());
  }, []);

  if (!artwork) {
    return (
      <div className="px-6 pt-12">
        <div className="aspect-[4/5] w-full animate-pulse rounded-md bg-gallery-raised" />
      </div>
    );
  }

  return (
    <article>
      {/* Immersive hero */}
      <section className="relative">
        <Link href={`/artwork/${artwork.id}`} aria-label={`Open ${artwork.title}`} className="tap-clear block">
          <motion.div
            initial={{ scale: 1.06, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-[72vh] min-h-[460px] w-full overflow-hidden"
          >
            <ArtworkImage src={artwork.thumbnail} alt={artwork.title} priority fit="cover" className="h-full w-full" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 scrim-t" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 scrim-b" />
          </motion.div>
        </Link>

        {/* Top label */}
        <div className="safe-top pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-6 pt-7">
          <p className="eyebrow text-linen/90">Artwork of the Day</p>
          <p className="text-[0.68rem] tracking-wide text-linen/70">{label}</p>
        </div>

        {/* Bottom museum label, laid over the image */}
        <div className="absolute inset-x-0 bottom-0 px-6 pb-7">
          <p className="eyebrow text-gilt/90">{artwork.movement}</p>
          <h1 className="mt-2 max-w-[15ch] font-serif text-[2.5rem] font-light leading-[1.04] tracking-tight text-linen drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
            {artwork.title}
          </h1>
        </div>
      </section>

      {/* Label sheet */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="px-6 pt-5"
      >
        <div className="flex items-center justify-between gap-3">
          <Link href={`/artist/${artwork.artistId}`} className="tap-clear flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gallery-raised text-[0.7rem] font-medium tracking-wide text-linen-dim ring-1 ring-white/[0.06]">
              {monogram(artwork.artist)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.95rem] text-linen">{artwork.artist}</span>
              {artwork.year && artwork.year !== 'Date unknown' && (
                <span className="block text-xs text-linen-faint">{artwork.year}</span>
              )}
            </span>
          </Link>
          <div className="flex shrink-0 items-center">
            <FavoriteButton artworkId={artwork.id} />
            <ShareButton title={`${artwork.title} — ${artwork.artist}`} />
          </div>
        </div>

        <p className="mt-6 max-w-reading text-[1.05rem] leading-[1.75] text-linen-dim">
          {artwork.overview}
        </p>

        <Link
          href={`/artwork/${artwork.id}`}
          className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-gilt"
        >
          Read the full story
          <ChevronIcon className="text-[1rem] transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>

        <Link
          href="/explore"
          className="mt-10 flex items-center justify-between border-t border-white/[0.07] py-5 text-sm text-linen-dim transition-colors hover:text-linen"
        >
          Browse the whole collection
          <ChevronIcon className="text-[1.1rem] text-linen-faint" />
        </Link>
      </motion.div>
    </article>
  );
}
