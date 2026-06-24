'use client';

import { motion } from 'framer-motion';
import { useFavorites } from '@/lib/useFavorites';
import { HeartIcon } from './icons';

type Props = { artworkId: string; variant?: 'overlay' | 'plain'; className?: string };

export function FavoriteButton({ artworkId, variant = 'plain', className = '' }: Props) {
  const { isFavorite, toggleFavorite, ready } = useFavorites();
  const active = isFavorite(artworkId);

  const skin =
    variant === 'overlay'
      ? 'bg-black/30 backdrop-blur-md ring-1 ring-white/10 hover:bg-black/45'
      : 'hover:bg-white/[0.06]';

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(artworkId)}
      aria-pressed={active}
      aria-label={active ? 'Remove from saved' : 'Save artwork'}
      disabled={!ready}
      className={`tap-clear inline-flex h-11 w-11 items-center justify-center rounded-full text-[1.3rem] transition-colors ${skin} ${className}`}
    >
      <motion.span
        key={active ? 'on' : 'off'}
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 16 }}
        className={active ? 'text-gilt' : 'text-linen'}
      >
        <HeartIcon filled={active} />
      </motion.span>
    </button>
  );
}
