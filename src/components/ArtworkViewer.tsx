'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { orderedArtworks, getArtist } from '@/lib/db';
import { loadDetails } from '@/lib/details';
import type { ArtworkDetail } from '@/types/artwork';
import { monogram } from '@/lib/format';
import { ArtworkImage } from './ArtworkImage';
import { ExpandableSection } from './ExpandableSection';
import { FavoriteButton } from './FavoriteButton';
import { ShareButton } from './ShareButton';
import { ChevronIcon, CloseIcon } from './icons';

const SWIPE_THRESHOLD = 70;

export function ArtworkViewer({
  startId,
  initialDetail,
}: {
  startId: string;
  initialDetail: ArtworkDetail | null;
}) {
  const router = useRouter();
  const list = useMemo(() => orderedArtworks(), []);
  const startIndex = Math.max(0, list.findIndex((a) => a.id === startId));
  const [[index, direction], setState] = useState<[number, number]>([startIndex, 0]);

  const artwork = list[index];
  const artistRec = getArtist(artwork.artistId);

  // Detail prose loads lazily. The entry artwork is seeded from a prop (so it is
  // in the static HTML); swiped-to artworks fill in from the fetched detail map.
  const [details, setDetails] = useState<Record<string, ArtworkDetail>>(
    initialDetail ? { [startId]: initialDetail } : {},
  );
  useEffect(() => {
    let alive = true;
    loadDetails()
      .then((map) => alive && setDetails((prev) => ({ ...map, ...prev })))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const detail = details[artwork.id];

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

  // Remember the position within this deck so that returning here (browser back
  // from an artist/museum page) lands on the artwork you left from — not the one
  // you originally entered on. Keyed by entry point so opening a different
  // artwork starts fresh. (We deliberately do NOT rewrite the URL on swipe: that
  // desynced Next's router state and made "back" jump to the entry artwork.)
  const sessionKey = `am:viewer:${startId}`;
  useEffect(() => {
    const saved = sessionStorage.getItem(sessionKey);
    if (saved) {
      const i = list.findIndex((a) => a.id === saved);
      if (i >= 0) setState([i, 0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstPersist = useRef(true);
  useEffect(() => {
    if (firstPersist.current) {
      firstPersist.current = false;
      return; // don't overwrite the saved position before restore runs
    }
    sessionStorage.setItem(sessionKey, list[index].id);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [index, list, sessionKey]);

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
    <div className="min-h-dvh bg-gallery">
      {/* Top controls */}
      <div className="safe-top fixed inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-3 pb-8 pt-3 scrim-t">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Close"
            className="tap-clear inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/25 text-[1.25rem] text-linen ring-1 ring-white/10 backdrop-blur-md transition-colors hover:bg-black/40"
          >
            <CloseIcon />
          </button>
          <span className="rounded-full bg-black/25 px-3 py-1 text-[0.68rem] tabular-nums tracking-widest text-linen/80 ring-1 ring-white/10 backdrop-blur-md">
            {index + 1} / {list.length}
          </span>
          <div className="flex items-center gap-1">
            <FavoriteButton artworkId={artwork.id} variant="overlay" />
            <ShareButton title={`${artwork.title} — ${artwork.artist}`} variant="overlay" />
          </div>
        </div>
      </div>

      {/* Swipeable spotlit artwork */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={onDragEnd}
        className="safe-top flex min-h-[78vh] cursor-grab touch-pan-y items-center px-5 pb-4 pt-20 active:cursor-grabbing"
      >
        <AnimatePresence custom={direction} mode="popLayout" initial={false}>
          <motion.div
            key={artwork.id}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            <ArtworkImage
              src={artwork.thumbnail}
              alt={artwork.title}
              priority
              fit="contain"
              className="mx-auto max-h-[68vh] w-full !bg-transparent drop-shadow-[0_30px_60px_rgba(0,0,0,0.7)]"
              imgClassName="pointer-events-none select-none"
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Navigation affordance */}
      <div className="flex items-center justify-center gap-7 pb-2 text-linen-faint">
        <button onClick={() => go(-1)} aria-label="Previous artwork" className="tap-clear rotate-180 p-2 transition-colors hover:text-linen">
          <ChevronIcon className="text-[1.1rem]" />
        </button>
        <span className="eyebrow">Swipe</span>
        <button onClick={() => go(1)} aria-label="Next artwork" className="tap-clear p-2 transition-colors hover:text-linen">
          <ChevronIcon className="text-[1.1rem]" />
        </button>
      </div>

      {/* The museum label */}
      <motion.div
        key={`${artwork.id}-text`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-t-[1.75rem] bg-gallery-raised/60 px-6 pb-20 pt-8"
      >
        <p className="eyebrow text-gilt/90">{artwork.movement}</p>
        <h1 className="mt-3 font-serif text-[2rem] font-light leading-[1.08] tracking-tight text-linen">
          {artwork.title}
        </h1>

        <Link href={`/artist/${artwork.artistId}`} className="tap-clear mt-4 flex items-center gap-3">
          {artistRec?.portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artistRec.portrait}
              alt={artwork.artist}
              loading="lazy"
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/[0.07]"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gallery text-[0.65rem] font-medium tracking-wide text-linen-dim ring-1 ring-white/[0.07]">
              {monogram(artwork.artist)}
            </span>
          )}
          <span>
            <span className="block text-[0.95rem] text-linen">{artwork.artist}</span>
            {artwork.year && artwork.year !== 'Date unknown' && (
              <span className="block text-xs text-linen-faint">{artwork.year}</span>
            )}
          </span>
        </Link>

        <dl className="mt-6 space-y-2.5 border-t border-white/[0.07] pt-5 text-sm">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-linen-faint">Museum</dt>
            <dd className="text-linen-dim">
              <Link href={`/museum/${artwork.museumId}`} className="transition-colors hover:text-linen">
                {artwork.museum}
              </Link>
              {artwork.museumLocation ? `, ${artwork.museumLocation}` : ''}
            </dd>
          </div>
          {artwork.medium && artwork.medium !== 'Medium unknown' && (
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-linen-faint">Medium</dt>
              <dd className="text-linen-dim">{artwork.medium}</dd>
            </div>
          )}
        </dl>

        {enrichmentNote && (
          <p className="mt-5 border-l-2 border-gilt/40 pl-3 text-xs leading-relaxed text-linen-faint">
            {enrichmentNote}
          </p>
        )}

        <div className="mt-7">
          {artwork.overview?.trim() && (
            <ExpandableSection title="Overview" defaultOpen>
              <p>{artwork.overview}</p>
            </ExpandableSection>
          )}
          {detail?.creationStory?.trim() && (
            <ExpandableSection title="Creation Story">
              <p>{detail.creationStory}</p>
            </ExpandableSection>
          )}
          {detail?.whoIsDepicted?.trim() && (
            <ExpandableSection title="Who Is Depicted">
              <p>{detail.whoIsDepicted}</p>
            </ExpandableSection>
          )}
          {detail?.historicalContext?.trim() && (
            <ExpandableSection title="Historical Context">
              <p>{detail.historicalContext}</p>
            </ExpandableSection>
          )}
          {(detail?.interestingFacts?.length ?? 0) > 0 && (
            <ExpandableSection title="Interesting Facts">
              <ul className="list-disc space-y-2.5 pl-5 marker:text-gilt/60">
                {detail!.interestingFacts.map((fact, i) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            </ExpandableSection>
          )}
          <div className="border-t border-white/[0.07]" />
        </div>

        {(detail?.sourceLinks?.length ?? 0) > 0 && (
          <div className="mt-7 flex flex-wrap gap-4">
            {detail!.sourceLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gilt underline-offset-4 transition-colors hover:underline"
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
