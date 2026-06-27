'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { HeartIcon } from './icons';

const STUB_W = 66; // px — matches the museum tickets for a consistent silhouette
const NOTCH = 15; // px — punched notches on the perforation

// Soft, deterministic barcode for the stub.
const BARS = [2, 1, 3, 1, 2, 2, 1, 3, 2, 1, 1, 2];

type Props = {
  id: string;
  label: string;
};

/**
 * A special, not-yet-filled collection rendered as a delicate white-and-rose
 * admission pass — an invitation that glows against the dark gallery. Tapping it
 * opens a gentle "coming soon" page.
 */
export function ComingSoonTicket({ id, label }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div whileHover={reduce ? undefined : { y: -2 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
      <Link
        href={`/explore/${id}`}
        aria-label={`${label} — coming soon`}
        className="tap-clear relative block rounded-[15px]"
      >
        <div className="relative flex h-[160px] w-full overflow-visible rounded-[15px] shadow-[0_18px_50px_-18px_rgba(207,125,156,0.5)]">
          {/* — Face — warm white with a soft rose glow — */}
          <div
            className="relative min-w-0 flex-1 overflow-hidden rounded-l-[15px] ring-1 ring-[#e9d4dc]"
            style={{ background: 'linear-gradient(135deg, #fcf9f4 0%, #f6eee7 60%, #f3e6ec 100%)' }}
          >
            {/* faint rose bloom in the corner */}
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(207,125,156,0.22), rgba(207,125,156,0) 70%)' }}
            />
            {/* fine invitation hairline */}
            <div className="pointer-events-none absolute inset-2.5 rounded-[10px] ring-1 ring-[#e7cdd6]" />

            <div className="relative flex h-full flex-col justify-between p-4">
              <div className="flex items-start justify-between">
                <span className="text-[0.6rem] font-medium uppercase tracking-[0.28em] text-[#cf7d9c]">
                  Reserved
                </span>
                <span className="text-[#d98ba6]">
                  <HeartIcon className="text-[1.05rem]" filled />
                </span>
              </div>

              <div>
                <h3 className="font-serif text-[1.4rem] font-light leading-[1.06] tracking-tight text-[#4a4039]">
                  {label}
                </h3>
                <p className="mt-2 inline-flex items-center gap-2">
                  <span className="inline-block h-1 w-1 rounded-full bg-[#d98ba6]" />
                  <span className="text-[0.62rem] font-medium uppercase tracking-[0.26em] text-[#b07e90]">
                    Coming soon
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* — Stub — */}
          <div
            className="relative flex flex-col items-center justify-between overflow-hidden rounded-r-[15px] py-3.5 ring-1 ring-[#e9d4dc]"
            style={{ width: STUB_W, background: 'linear-gradient(135deg, #fbf6f1, #f4e7ed)' }}
          >
            <div className="flex h-7 items-stretch gap-[2px]" aria-hidden>
              {BARS.map((w, i) => (
                <span key={i} style={{ width: w }} className="block bg-[#cf7d9c]/55" />
              ))}
            </div>
            <span
              className="font-sans text-[8px] tabular-nums tracking-[0.3em] text-[#c08aa0]"
              style={{ writingMode: 'vertical-rl' }}
            >
              000 0000 0001
            </span>
            <span
              className="text-[0.5rem] font-medium uppercase tracking-[0.34em] text-[#cf7d9c]"
              style={{ writingMode: 'vertical-rl' }}
            >
              With Love
            </span>
          </div>

          {/* — Perforation seam + punched notches (dark, like the other tickets) — */}
          <div
            className="pointer-events-none absolute inset-y-2 border-l border-dashed border-[#dcb9c6]"
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
      </Link>
    </motion.div>
  );
}
