'use client';

import { useState } from 'react';
import { ShareIcon } from './icons';

type Props = { title: string; text?: string; variant?: 'overlay' | 'plain'; className?: string };

/** Uses the native share sheet when available; falls back to copying the link. */
export function ShareButton({ title, text, variant = 'plain', className = '' }: Props) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* user dismissed the share sheet — ignore */
    }
  };

  const skin =
    variant === 'overlay'
      ? 'bg-black/30 backdrop-blur-md ring-1 ring-white/10 hover:bg-black/45'
      : 'hover:bg-white/[0.06]';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Share"
      className={`tap-clear relative inline-flex h-11 w-11 items-center justify-center rounded-full text-[1.2rem] text-linen transition-colors ${skin} ${className}`}
    >
      <ShareIcon />
      {copied && (
        <span className="absolute -bottom-7 right-0 whitespace-nowrap rounded-full bg-gallery-raised px-2.5 py-1 text-[0.65rem] text-linen-dim ring-1 ring-white/10">
          Link copied
        </span>
      )}
    </button>
  );
}
