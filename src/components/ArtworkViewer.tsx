'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { orderedArtworks } from '@/lib/db';
import { ArtworkImage } from './ArtworkImage';
import { ExpandableSection } from './ExpandableSection';
import { FavoriteButton } from './FavoriteButton';
import { ArrowLeftIcon, ChevronIcon } from './icons';

const SWIPE_THRESHOLD = 70;

export function ArtworkViewer({ startId }: { startId: string }) {
  const router = useRouter();
  const list = useMemo(() => orderedArtworks(), []);
  const startIndex = Math.max(0, list.findIndex((a) => a.id === startId));
  const [[index, direction], setState] = useState<[number, number]>([startIndex, 0]);

  const artwork = list[index];

  const go = useCallback(
    (dir: 1 | -1) => {
      setState(([i]) => [(i + dir + list.length) % list.length, dir]);
    },
    [list],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // When the artwork changes: keep the URL in sync (smooth, shareable, offline)
  // and scroll back to the top. Done in an effect so the side effect never runs
  // during render.
  useEffect(() => {
    window.history.replaceState(null, '', `/artwork/${list[index].id}/`);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [index, list]);

  // Preload the neighbouring images so swiping in either direction is instant.
  useEffect(() => {
    const neighbours = [index - 1, index + 1, index + 2].map(
      (i) => list[(i + list.length) % list.length],
    );
    const imgs = neighbours.map((a) => {
      const img = new window.Image();
      img.src = a.thumbnail;
      return img;
    });
    return () => imgs.forEach((img) => (img.src = ''));
  }, [index, list]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) go(1);
    else if (info.offset.x > SWIPE_THRESHOLD) go(-1);
  };

  const enrichmentNote =
    artwork.enrichmentStatus !== 'enriched'
      ? 'Extended details for this work are limited. The notes below are drawn from museum records.'
      : null;

  const slide = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  return (
    <div className="min-h-dvh">
      {/* Top controls */}
      <div className="safe-top sticky top-0 z-30">
        <div className="flex items-center justify-between bg-gradient-to-b from-paper via-paper/90 to-transparent px-4 pb-6 pt-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="tap-clear inline-flex h-10 w-10 items-center justify-center rounded-full text-[1.3rem] text-ink hover:bg-ink/5"
          >
            <ArrowLeftIcon />
          </button>
          <span className="text-[0.7rem] uppercase tracking-widest text-ink-faint">
            {index + 1} / {list.length}
          </span>
          <FavoriteButton artworkId={artwork.id} />
        </div>
      </div>

      {/* Swipeable image */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={onDragEnd}
        className="-mt-12 cursor-grab touch-pan-y px-4 active:cursor-grabbing"
      >
        <AnimatePresence custom={direction} mode="popLayout" initial={false}>
          <motion.div
            key={artwork.id}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <ArtworkImage
              src={artwork.thumbnail}
              alt={artwork.title}
              priority
              fit="contain"
              className="mx-auto max-h-[64vh] min-h-[44vh] w-full rounded-lg"
              imgClassName="pointer-events-none select-none"
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Desktop / keyboard navigation hint */}
      <div className="mt-3 flex items-center justify-center gap-6 text-ink-ghost">
        <button onClick={() => go(-1)} aria-label="Previous artwork" className="tap-clear rotate-180 p-2 hover:text-ink">
          <ChevronIcon className="text-[1.1rem]" />
        </button>
        <span className="text-[0.65rem] uppercase tracking-widest">Swipe</span>
        <button onClick={() => go(1)} aria-label="Next artwork" className="tap-clear p-2 hover:text-ink">
          <ChevronIcon className="text-[1.1rem]" />
        </button>
      </div>

      {/* Details */}
      <motion.div
        key={`${artwork.id}-text`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="px-5 pb-16 pt-6"
      >
        <h1 className="font-serif text-[1.7rem] leading-tight text-ink">{artwork.title}</h1>
        <p className="mt-1.5 text-ink-soft">
          <Link href={`/artist/${artwork.artistId}`} className="underline-offset-2 hover:underline">
            {artwork.artist}
          </Link>
          {artwork.year && artwork.year !== 'Date unknown' ? `, ${artwork.year}` : ''}
        </p>

        <dl className="mt-4 space-y-1 text-sm text-ink-faint">
          <div className="flex gap-2">
            <dt className="sr-only">Museum</dt>
            <dd>
              <Link href={`/museum/${artwork.museumId}`} className="underline-offset-2 hover:underline">
                {artwork.museum}
              </Link>
              {artwork.museumLocation ? `, ${artwork.museumLocation}` : ''}
            </dd>
          </div>
          {artwork.movement && (
            <div className="flex gap-2">
              <dt className="text-ink-ghost">Movement</dt>
              <dd>{artwork.movement}</dd>
            </div>
          )}
          {artwork.medium && artwork.medium !== 'Medium unknown' && (
            <div className="flex gap-2">
              <dt className="text-ink-ghost">Medium</dt>
              <dd>{artwork.medium}</dd>
            </div>
          )}
        </dl>

        {enrichmentNote && (
          <p className="mt-4 rounded-lg bg-paper-dim px-3 py-2 text-xs leading-relaxed text-ink-faint">
            {enrichmentNote}
          </p>
        )}

        <div className="mt-6">
          <ExpandableSection title="Overview" defaultOpen>
            <p>{artwork.overview}</p>
          </ExpandableSection>
          <ExpandableSection title="Creation Story">
            <p>{artwork.creationStory}</p>
          </ExpandableSection>
          <ExpandableSection title="Who Is Depicted">
            <p>{artwork.whoIsDepicted}</p>
          </ExpandableSection>
          <ExpandableSection title="Historical Context">
            <p>{artwork.historicalContext}</p>
          </ExpandableSection>
          {artwork.interestingFacts.length > 0 && (
            <ExpandableSection title="Interesting Facts">
              <ul className="list-disc space-y-2 pl-5">
                {artwork.interestingFacts.map((fact, i) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            </ExpandableSection>
          )}
          <div className="border-t border-ink/10" />
        </div>

        {artwork.sourceLinks.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {artwork.sourceLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent underline-offset-2 hover:underline"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
