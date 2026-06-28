'use client';

import { useState } from 'react';
import { CollectionSheet } from './CollectionSheet';
import { CollectionIcon } from './icons';

type Props = { artworkId: string; variant?: 'overlay' | 'plain'; className?: string };

/** Opens the bottom sheet for filing an artwork into personal collections. */
export function AddToCollectionButton({ artworkId, variant = 'plain', className = '' }: Props) {
  const [open, setOpen] = useState(false);

  const skin =
    variant === 'overlay'
      ? 'bg-black/30 backdrop-blur-md ring-1 ring-white/10 hover:bg-black/45'
      : 'hover:bg-white/[0.06]';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add to a collection"
        className={`tap-clear inline-flex h-11 w-11 items-center justify-center rounded-full text-[1.2rem] text-linen transition-colors ${skin} ${className}`}
      >
        <CollectionIcon />
      </button>
      <CollectionSheet artworkId={artworkId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
