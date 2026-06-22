'use client';

import { useState } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  /** object-fit; 'contain' for the immersive viewer, 'cover' for grids. */
  fit?: 'cover' | 'contain';
};

/** Remote museum image with a quiet fade-in and graceful error state. */
export function ArtworkImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  priority = false,
  fit = 'cover',
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-paper-deep ${className}`}>
      {!loaded && !errored && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-paper-dim to-paper-deep" />
      )}
      {errored ? (
        <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-ink-faint">
          Image unavailable
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`h-full w-full transition-opacity duration-700 ease-soft ${
            fit === 'contain' ? 'object-contain' : 'object-cover'
          } ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      )}
    </div>
  );
}
