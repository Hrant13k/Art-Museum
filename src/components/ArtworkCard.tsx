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
      <div className="art-frame aspect-[4/5] w-full transition-transform duration-500 ease-soft group-active:scale-[0.98]">
        <ArtworkImage
          src={artwork.thumbnail}
          alt={artwork.title}
          className="h-full w-full"
          imgClassName="transition-transform duration-[1.2s] ease-soft group-hover:scale-[1.04]"
        />
      </div>
      <div className="px-0.5 pt-3">
        <h3 className="line-clamp-2 font-serif text-[0.98rem] leading-snug text-linen">
          {artwork.title}
        </h3>
        <p className="mt-1 truncate text-xs text-linen-faint">{artwork.artist}</p>
      </div>
    </Link>
  );
}

export function ArtworkGrid({ artworks }: { artworks: Artwork[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
      {artworks.map((a) => (
        <ArtworkCard key={a.id} artwork={a} />
      ))}
    </div>
  );
}
