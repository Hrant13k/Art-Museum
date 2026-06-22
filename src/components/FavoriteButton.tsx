'use client';

import { motion } from 'framer-motion';
import { useFavorites } from '@/lib/useFavorites';
import { HeartIcon } from './icons';

type Props = { artworkId: string; variant?: 'overlay' | 'plain'; className?: string };

export function FavoriteButton({ artworkId, variant = 'plain', className = '' }: Props) {
  const { isFavorite, toggleFavorite, ready } = useFavorites();
  const active = isFavorite(artworkId);

  const overlay =
    variant === 'overlay'
      ? 'bg-canvas/40 text-white backdrop-blur-md hover:bg-canvas/55'
      : 'text-ink hover:bg-ink/5';

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(artworkId)}
      aria-pressed={active}
      aria-label={active ? 'Remove from saved' : 'Save artwork'}
      disabled={!ready}
      className={`tap-clear inline-flex h-11 w-11 items-center justify-center rounded-full text-[1.3rem] transition-colors ${overlay} ${className}`}
    >
      <motion.span
        key={active ? 'on' : 'off'}
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
        className={active ? 'text-accent' : ''}
      >
        <HeartIcon filled={active} />
      </motion.span>
    </button>
  );
}
