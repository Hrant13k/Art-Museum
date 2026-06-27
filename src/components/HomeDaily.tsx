'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import type { Artwork } from '@/types/artwork';
import { dailyArtwork, todayLabel, todayShort } from '@/lib/daily';
import { getArtist } from '@/lib/db';
import { monogram } from '@/lib/format';
import { ArtworkImage } from './ArtworkImage';
import { FavoriteButton } from './FavoriteButton';
import { ShareButton } from './ShareButton';
import { ChevronIcon } from './icons';

function lifespan(birth: string | null, death: string | null): string | null {
  if (!birth && !death) return null;
  return `${birth ?? '?'} – ${death ?? 'present'}`;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeDaily() {
  const reduce = useReducedMotion();
  // Each info block rises into view as you scroll the label sheet up.
  const reveal = reduce
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } };

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [label, setLabel] = useState('');
  const [short, setShort] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    try {
      setArtwork(dailyArtwork());
      setLabel(todayLabel());
      setShort(todayShort());
    } catch {
      setFailed(true); // empty/unavailable collection — degrade gracefully
    }
  }, []);

  // Scroll-linked motion: the artwork drifts and deepens as the label rises.
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 800], [0, 150]);
  const heroScale = useTransform(scrollY, [0, 800], [1, 1.12]);
  const darken = useTransform(scrollY, [0, 520], [0, 0.55]);
  const cueOpacity = useTransform(scrollY, [0, 140], [1, 0]);
  const heroStyle = reduce ? undefined : { y: heroY, scale: heroScale };

  if (failed) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <p className="font-serif text-2xl font-light text-linen">The collection is empty</p>
        <p className="mt-2 max-w-xs text-sm text-linen-dim">
          No artworks are available yet. Run the data collection step to populate the museum.
        </p>
      </div>
    );
  }

  if (!artwork) {
    return <div className="h-[100dvh] w-full animate-pulse bg-gallery-raised" />;
  }

  const artist = getArtist(artwork.artistId);
  const life = artist ? lifespan(artist.birthYear, artist.deathYear) : null;

  return (
    <article>
      {/* — Full-screen artwork of the day — */}
      <section className="relative h-[100dvh] w-full overflow-hidden">
        {/* Tappable artwork (opens the immersive viewer) */}
        <Link
          href={`/artwork/${artwork.id}`}
          aria-label={`Open ${artwork.title}`}
          className="tap-clear absolute inset-0 z-0 block"
        >
          <motion.div style={heroStyle} className="h-full w-full will-change-transform">
            <ArtworkImage src={artwork.thumbnail} alt={artwork.title} priority fit="cover" className="h-full w-full" />
          </motion.div>
        </Link>

        {/* Scrims for legibility + a deepening veil on scroll */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-44 scrim-t" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3/5 scrim-b" />
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 bg-gallery"
          style={reduce ? undefined : { opacity: darken }}
        />

        {/* Top labels — exhibition mark + date */}
        <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-6 pt-8">
          <p className="max-w-[7rem] font-serif text-[0.92rem] uppercase leading-snug tracking-[0.22em] text-gilt/90">
            Artwork of the Day
          </p>
          <p className="font-serif text-[0.92rem] uppercase tracking-[0.18em] text-gilt/90">{short}</p>
        </div>

        {/* Bottom — movement, title, artist */}
        <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-[calc(9rem+env(safe-area-inset-bottom))]">
          <p className="eyebrow text-gilt/80">{artwork.movement}</p>
          <h1 className="mt-3 max-w-[16ch] font-serif text-[2.7rem] font-light italic leading-[1.02] tracking-tight text-gilt drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)]">
            {artwork.title}
          </h1>
          <Link
            href={`/artist/${artwork.artistId}`}
            className="tap-clear pointer-events-auto mt-3 inline-block font-serif text-[0.92rem] uppercase tracking-[0.18em] text-gilt/85 transition-colors hover:text-gilt"
          >
            {artist?.name ?? artwork.artist}
            {life ? ` (${life})` : ''}
          </Link>
        </div>

        {/* Scroll cue — sits in a clear band below the title, fades on scroll */}
        <motion.div
          style={reduce ? undefined : { opacity: cueOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex flex-col items-center gap-1 text-gilt/70"
        >
          <span className="text-[0.6rem] uppercase tracking-[0.3em]">Scroll</span>
          <motion.span
            animate={reduce ? undefined : { y: [0, 5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="rotate-90 text-[1rem]"
          >
            <ChevronIcon />
          </motion.span>
        </motion.div>
      </section>

      {/* — The museum label sheet, rising over the artwork on scroll — */}
      <div className="relative z-30 -mt-7 rounded-t-[1.85rem] bg-gallery pt-9 shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.05]">
        <div className="px-6 pb-4">
          {/* Artist + quick actions */}
          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-12% 0px' }}
            className="flex items-center justify-between gap-3"
          >
            <Link href={`/artist/${artwork.artistId}`} className="tap-clear flex min-w-0 items-center gap-3">
              {artist?.portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artist.portrait}
                  alt={artwork.artist}
                  loading="lazy"
                  className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/[0.07]"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gallery-raised text-[0.72rem] font-medium tracking-wide text-linen-dim ring-1 ring-white/[0.07]">
                  {monogram(artwork.artist)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-[0.98rem] text-linen">{artist?.name ?? artwork.artist}</span>
                {life && <span className="block truncate text-xs text-linen-faint">{life}</span>}
              </span>
            </Link>
            <div className="flex shrink-0 items-center">
              <FavoriteButton artworkId={artwork.id} />
              <ShareButton title={`${artwork.title} — ${artwork.artist}`} />
            </div>
          </motion.div>

          {/* Overview */}
          {artwork.overview?.trim() && (
            <motion.p
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-12% 0px' }}
              className="mt-7 max-w-reading text-[1.05rem] leading-[1.75] text-linen-dim"
            >
              {artwork.overview}
            </motion.p>
          )}

          {/* Calls to action */}
          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-12% 0px' }}
          >
            <Link
              href={`/artwork/${artwork.id}`}
              className="group mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-gilt"
            >
              Read the full story
              <ChevronIcon className="text-[1rem] transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/explore"
              className="mt-9 flex items-center justify-between border-t border-white/[0.07] py-5 text-sm text-linen-dim transition-colors hover:text-linen"
            >
              Browse the whole collection
              <ChevronIcon className="text-[1.1rem] text-linen-faint" />
            </Link>
          </motion.div>
        </div>
      </div>
    </article>
  );
}
