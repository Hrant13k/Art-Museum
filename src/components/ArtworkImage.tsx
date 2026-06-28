'use client';

import { useState } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  /** object-fit; 'contain' for the immersive viewer, 'cover' for heroes/grids. */
  fit?: 'cover' | 'contain';
  /** CSS object-position for focal-point cropping, e.g. 'center 30%'. */
  objectPosition?: string;
};

/** Remote museum image with a quiet fade-in and graceful error state. */
export function ArtworkImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  priority = false,
  fit = 'cover',
  objectPosition,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-gallery-raised ${className}`}>
      {!loaded && !errored && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
        </div>
      )}
      {errored ? (
        <div className="flex h-full w-full items-center justify-center p-6 text-center text-xs uppercase tracking-eyebrow text-linen-faint">
          Image unavailable
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={objectPosition ? { objectPosition } : undefined}
          className={`h-full w-full transition-opacity duration-[900ms] ease-soft ${
            fit === 'contain' ? 'object-contain' : 'object-cover'
          } ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      )}
    </div>
  );
}
