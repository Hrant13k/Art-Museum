'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCollectionItemIds } from '@/lib/collections';
import { getArtwork } from '@/lib/db';
import { ArtworkImage } from './ArtworkImage';
import { CollectionIcon } from './icons';

type Props = { id: string; name: string; count: number };

/** A collection as a curated folder, with a mosaic cover from its works. */
export function CollectionCard({ id, name, count }: Props) {
  const [covers, setCovers] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    getCollectionItemIds(id).then((ids) => {
      if (!alive) return;
      const thumbs = ids
        .map((aid) => getArtwork(aid)?.thumbnail)
        .filter((t): t is string => Boolean(t))
        .slice(0, 4);
      setCovers(thumbs);
    });
    return () => {
      alive = false;
    };
  }, [id, count]);

  return (
    <Link href={`/collection/?id=${id}`} className="tap-clear group block">
      <div className="art-frame aspect-square w-full overflow-hidden transition-transform duration-500 ease-soft group-active:scale-[0.98]">
        {covers.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-[1.6rem] text-linen-faint">
            <CollectionIcon />
          </div>
        ) : covers.length === 1 ? (
          <ArtworkImage src={covers[0]} alt="" className="h-full w-full" />
        ) : (
          <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px">
            {[0, 1, 2, 3].map((i) =>
              covers[i] ? (
                <ArtworkImage key={i} src={covers[i]} alt="" className="h-full w-full" />
              ) : (
                <div key={i} className="h-full w-full bg-gallery-raised" />
              ),
            )}
          </div>
        )}
      </div>
      <div className="px-0.5 pt-3">
        <h3 className="truncate font-serif text-[1.05rem] font-light text-linen">{name}</h3>
        <p className="mt-0.5 text-xs text-linen-faint">
          {count} {count === 1 ? 'work' : 'works'}
        </p>
      </div>
    </Link>
  );
}
