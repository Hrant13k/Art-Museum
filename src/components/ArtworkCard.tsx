import Link from 'next/link';
import type { Artwork } from '@/types/artwork';
import { ArtworkImage } from './ArtworkImage';

export function ArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    <Link
      href={`/artwork/${artwork.id}`}
      className="tap-clear group block"
      aria-label={`${artwork.title} by ${artwork.artist}`}
    >
      <div className="overflow-hidden rounded-lg bg-paper-deep shadow-sm">
        <ArtworkImage
          src={artwork.thumbnail}
          alt={artwork.title}
          className="aspect-[3/4] w-full"
          imgClassName="transition-transform duration-700 ease-soft group-active:scale-[1.03]"
        />
      </div>
      <div className="px-0.5 pt-2">
        <h3 className="line-clamp-2 font-serif text-[0.95rem] leading-snug text-ink">
          {artwork.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-ink-faint">{artwork.artist}</p>
      </div>
    </Link>
  );
}

export function ArtworkGrid({ artworks }: { artworks: Artwork[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3">
      {artworks.map((a) => (
        <ArtworkCard key={a.id} artwork={a} />
      ))}
    </div>
  );
}
