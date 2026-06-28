'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArtworkImage } from './ArtworkImage';

const STUB_W = 66; // px — width of the tear-off stub
const NOTCH = 15; // px — diameter of the punched notches on the seam

// Deterministic hash → stable serial/barcode per collection (no hydration drift).
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

type Props = {
  id: string;
  index: number;
  label: string;
  count: number;
  /** Representative artwork image for the ticket face. */
  image?: string;
  alt?: string;
  /** Focal-point crop for the face, e.g. 'center 30%'. */
  objectPosition?: string;
  /** Eagerly load the face — set for the above-the-fold tickets (LCP). */
  priority?: boolean;
};

export function CollectionTicket({ id, index, label, count, image, alt, objectPosition, priority }: Props) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [torn, setTorn] = useState(false);
  const navigated = useRef(false);
  const href = `/explore/${id}`;

  const serial = String(hash(id)).padStart(12, '0').slice(0, 12);
  const serialText = `${serial.slice(0, 3)} ${serial.slice(3, 7)} ${serial.slice(7, 12)}`;
  const bars = Array.from(serial).map((d) => 1 + (Number(d) % 3)); // widths 1–3px
  const no = String(index).padStart(2, '0');

  const go = () => {
    if (navigated.current) return;
    navigated.current = true;
    router.push(href);
  };

  // Warm the destination as soon as the finger lands, so the tear is over by the
  // time the exhibition is ready — navigation feels instant.
  const prefetch = () => router.prefetch(href);

  const onActivate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (reduce) {
      go();
      return;
    }
    setTorn(true); // tear plays, then onAnimationComplete navigates
  };

  // The stub rips off along the perforation and drops away while the face lifts
  // toward you; a veil then darkens into the (dark) exhibition page. Keyframed so
  // the physical separation is visible before either half fades out.
  const ease = [0.22, 1, 0.36, 1] as const;
  const face: Variants = {
    idle: { x: 0, rotate: 0, opacity: 1 },
    torn: {
      x: [0, -3, -14],
      rotate: [0, 0.6, -1.6],
      opacity: [1, 1, 0],
      transition: { duration: 0.52, times: [0, 0.4, 1], ease },
    },
  };
  const stub: Variants = {
    idle: { x: 0, y: 0, rotate: 0, opacity: 1 },
    torn: {
      x: [0, 6, 30],
      y: [0, -3, 42],
      rotate: [0, -3, 12],
      opacity: [1, 1, 0],
      transition: { duration: 0.58, times: [0, 0.32, 1], ease },
    },
  };
  const shell: Variants = {
    idle: { scale: 1 },
    torn: { scale: [1, 1.015, 1.03], transition: { duration: 0.58, times: [0, 0.3, 1], ease } },
  };
  const veil: Variants = {
    idle: { opacity: 0 },
    torn: { opacity: [0, 0, 1], transition: { duration: 0.58, times: [0, 0.5, 1], ease } },
  };
  const state = torn ? 'torn' : 'idle';

  return (
    <motion.a
      href={href}
      onClick={onActivate}
      onPointerDown={prefetch}
      onFocus={prefetch}
      aria-label={`${label} exhibition, ${count} ${count === 1 ? 'work' : 'works'}`}
      variants={shell}
      animate={state}
      whileTap={torn ? undefined : { scale: 0.985 }}
      onAnimationComplete={(d) => d === 'torn' && go()}
      className="tap-clear relative block rounded-[15px]"
      style={{ pointerEvents: torn ? 'none' : undefined }}
    >
      <div
        className="relative flex h-[152px] w-full overflow-visible rounded-[15px] shadow-[0_20px_44px_-26px_rgba(0,0,0,0.95)]"
        style={{ filter: 'none' }}
      >
        {/* — Face: the exhibition's artwork — */}
        <motion.div
          variants={face}
          animate={state}
          className="relative min-w-0 flex-1 overflow-hidden rounded-l-[15px] bg-gallery-raised ring-1 ring-white/[0.06]"
        >
          {image ? (
            <ArtworkImage
              src={image}
              alt={alt ?? label}
              fit="cover"
              objectPosition={objectPosition}
              priority={priority}
              className="h-full w-full"
            />
          ) : (
            <div className="h-full w-full bg-gallery-raised" />
          )}
          {/* Legibility scrim — darker toward the lower-left where the title sits. */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(12,11,9,0.92) 0%, rgba(12,11,9,0.55) 34%, rgba(12,11,9,0.12) 64%, rgba(12,11,9,0.28) 100%)',
            }}
          />

          {/* Top row: exhibition mark + plate number */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-3.5">
            <span className="text-[0.6rem] font-medium uppercase tracking-eyebrow text-linen/80">
              Exhibition
            </span>
            <span className="font-serif text-[1.6rem] font-light leading-none text-linen/35">
              {no}
            </span>
          </div>

          {/* Bottom: collection title + count */}
          <div className="absolute inset-x-0 bottom-0 px-4 pb-3.5">
            <h3 className="max-w-[15ch] font-serif text-[1.5rem] font-light leading-[1.04] tracking-tight text-linen drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
              {label}
            </h3>
            <p className="mt-1.5 flex items-center gap-1.5 text-[0.62rem] uppercase tracking-eyebrow text-linen/75">
              <span className="inline-block h-1 w-1 rounded-full bg-gilt" />
              {count} {count === 1 ? 'work' : 'works'}
            </p>
          </div>
        </motion.div>

        {/* — Stub: the part that tears off — */}
        <motion.div
          variants={stub}
          animate={state}
          style={{ width: STUB_W, transformOrigin: 'left center' }}
          className="relative flex flex-col items-center justify-between overflow-hidden rounded-r-[15px] bg-gallery-raised py-3.5 ring-1 ring-white/[0.06]"
        >
          {/* paper sheen */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(105deg, rgba(255,255,255,0.04), rgba(255,255,255,0) 55%)' }}
          />
          {/* barcode */}
          <div className="flex h-7 items-stretch gap-[2px]" aria-hidden>
            {bars.map((w, i) => (
              <span key={i} style={{ width: w }} className="block bg-linen-faint/70" />
            ))}
          </div>
          {/* vertical serial */}
          <span
            className="font-sans text-[8px] tabular-nums tracking-[0.3em] text-linen-faint"
            style={{ writingMode: 'vertical-rl' }}
          >
            {serialText}
          </span>
          {/* admit one */}
          <span
            className="text-[0.5rem] font-medium uppercase tracking-[0.34em] text-gilt/80"
            style={{ writingMode: 'vertical-rl' }}
          >
            Admit One
          </span>
        </motion.div>

        {/* — Perforation seam: dashed line + two punched notches — */}
        <div
          className="pointer-events-none absolute inset-y-2 border-l border-dashed border-white/15"
          style={{ right: STUB_W }}
        />
        <span
          className="pointer-events-none absolute z-10 rounded-full bg-gallery"
          style={{ width: NOTCH, height: NOTCH, top: -NOTCH / 2, right: STUB_W - NOTCH / 2 }}
        />
        <span
          className="pointer-events-none absolute z-10 rounded-full bg-gallery"
          style={{ width: NOTCH, height: NOTCH, bottom: -NOTCH / 2, right: STUB_W - NOTCH / 2 }}
        />
      </div>

      {/* Transition veil — bridges the tear into the exhibition page. */}
      {torn && (
        <motion.div
          variants={veil}
          animate={state}
          className="fixed inset-0 z-50 bg-gallery"
          style={{ pointerEvents: 'none' }}
          aria-hidden
        />
      )}
    </motion.a>
  );
}
