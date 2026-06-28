'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useFavorites } from '@/lib/useFavorites';
import { useCollections } from '@/lib/useCollections';
import { getArtworksByIds } from '@/lib/db';
import { ArtworkGrid } from '@/components/ArtworkCard';
import { CollectionCard } from '@/components/CollectionCard';
import { PageHeader } from '@/components/PageHeader';
import { HeartIcon, PlusIcon } from '@/components/icons';

export default function FavoritesPage() {
  const { ids, ready } = useFavorites();
  const { collections, counts, ready: colReady, createCollection } = useCollections();
  const artworks = getArtworksByIds(ids);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const submit = async () => {
    if (!name.trim()) return;
    await createCollection(name);
    setName('');
    setCreating(false);
  };

  return (
    <div>
      <PageHeader eyebrow="Your library" title="Saved">
        {ready && artworks.length > 0
          ? `${artworks.length} ${artworks.length === 1 ? 'work' : 'works'} saved`
          : null}
      </PageHeader>

      {/* — Collections — */}
      <section className="px-6 pt-7">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="eyebrow">Collections</h2>
          {colReady && collections.length > 0 && (
            <span className="text-xs text-linen-faint">{collections.length}</span>
          )}
        </div>

        {creating && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-gallery-raised px-3 py-2 ring-1 ring-white/10 focus-within:ring-gilt/40">
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
                if (e.key === 'Escape') {
                  setCreating(false);
                  setName('');
                }
              }}
              maxLength={60}
              placeholder="Name your collection"
              className="w-full bg-transparent py-1.5 text-[0.98rem] text-linen outline-none placeholder:text-linen-faint"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!name.trim()}
              className="tap-clear shrink-0 rounded-full bg-linen px-4 py-1.5 text-sm font-medium text-gallery transition-opacity disabled:opacity-40"
            >
              Create
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
          {/* New collection */}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="tap-clear group block text-left"
          >
            <div className="flex aspect-square w-full items-center justify-center rounded-md text-gilt ring-1 ring-dashed ring-gilt/35 transition-colors group-hover:ring-gilt/60">
              <PlusIcon className="text-[1.6rem]" />
            </div>
            <p className="px-0.5 pt-3 font-serif text-[1.05rem] font-light text-linen">New collection</p>
            <p className="px-0.5 pt-0.5 text-xs text-linen-faint">Curate your own</p>
          </button>

          {collections.map((c) => (
            <CollectionCard key={c.id} id={c.id} name={c.name} count={counts[c.id] ?? 0} />
          ))}
        </div>
      </section>

      {/* — All saved — */}
      <section className="px-6 pb-12 pt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="eyebrow">All saved</h2>
          {ready && artworks.length > 0 && (
            <span className="text-xs text-linen-faint">{artworks.length}</span>
          )}
        </div>

        {!ready ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-md bg-gallery-raised" />
            ))}
          </div>
        ) : artworks.length === 0 ? (
          <div className="flex flex-col items-center px-6 pt-10 text-center">
            <span className="text-4xl text-linen-faint">
              <HeartIcon />
            </span>
            <p className="mt-5 font-serif text-2xl font-light text-linen">Nothing saved yet</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-linen-dim">
              Tap the mark on any artwork to keep it here, then file it into a collection. Everything
              stays on this device and works offline.
            </p>
            <Link
              href="/explore"
              className="mt-7 rounded-full px-5 py-2.5 text-sm text-linen ring-1 ring-white/15 transition-colors hover:ring-white/30"
            >
              Explore the collection
            </Link>
          </div>
        ) : (
          <ArtworkGrid artworks={artworks} />
        )}
      </section>
    </div>
  );
}
