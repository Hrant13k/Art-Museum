'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  type Collection,
  getCollection,
  getCollectionItemIds,
  renameCollection,
  deleteCollection,
  removeFromCollection,
} from '@/lib/collections';
import { getArtworksByIds } from '@/lib/db';
import { subscribe, emit } from '@/lib/events';
import { ArtworkImage } from '@/components/ArtworkImage';
import { ArrowLeftIcon, CloseIcon, EditIcon, TrashIcon, CheckIcon } from '@/components/icons';

function CollectionDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get('id');

  const [collection, setCollection] = useState<Collection | null | undefined>(undefined);
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!id) {
      setCollection(null);
      return;
    }
    const c = await getCollection(id);
    setCollection(c);
    if (c) {
      setName(c.name);
      setItemIds(await getCollectionItemIds(id));
    }
  }, [id]);

  useEffect(() => {
    load();
    return subscribe('collections', load);
  }, [load]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const artworks = getArtworksByIds(itemIds);

  const saveName = async () => {
    if (id && name.trim()) await renameCollection(id, name);
    setEditing(false);
    emit('collections');
  };

  const remove = async (artworkId: string) => {
    if (!id) return;
    await removeFromCollection(id, artworkId);
    setItemIds((prev) => prev.filter((x) => x !== artworkId));
    emit('collections');
  };

  const del = async () => {
    if (id) await deleteCollection(id);
    emit('collections');
    router.push('/favorites');
  };

  if (collection === undefined) {
    return (
      <div className="px-6 pb-12 pt-8">
        <div className="h-7 w-24 animate-pulse rounded bg-gallery-raised" />
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-md bg-gallery-raised" />
          ))}
        </div>
      </div>
    );
  }

  if (collection === null) {
    return (
      <div className="flex flex-col items-center px-6 pt-28 text-center">
        <p className="font-serif text-2xl font-light text-linen">Collection not found</p>
        <p className="mt-3 max-w-xs text-sm text-linen-dim">
          It may have been deleted from this device.
        </p>
        <Link
          href="/favorites"
          className="mt-7 rounded-full px-5 py-2.5 text-sm text-linen ring-1 ring-white/15 transition-colors hover:ring-white/30"
        >
          Back to Saved
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 pb-12">
      <header className="safe-top pb-2 pt-8">
        <Link
          href="/favorites"
          className="tap-clear -ml-1 mb-5 inline-flex items-center gap-1.5 text-sm text-linen-dim transition-colors hover:text-linen"
        >
          <ArrowLeftIcon className="text-[1.05rem]" />
          Saved
        </Link>

        <p className="eyebrow mb-2 text-gilt/90">Collection</p>

        {editing ? (
          <div className="flex items-center gap-2 rounded-2xl bg-gallery-raised px-3 py-2 ring-1 ring-white/10 focus-within:ring-gilt/40">
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') {
                  setName(collection.name);
                  setEditing(false);
                }
              }}
              maxLength={60}
              className="w-full bg-transparent py-1 font-serif text-[1.6rem] font-light text-linen outline-none"
            />
            <button
              type="button"
              onClick={saveName}
              aria-label="Save name"
              className="tap-clear inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gilt text-[1rem] text-gallery"
            >
              <CheckIcon />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 font-serif text-[2.3rem] font-light leading-[1.05] tracking-tight text-linen">
              {collection.name}
            </h1>
            <div className="mt-1 flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Rename collection"
                className="tap-clear inline-flex h-10 w-10 items-center justify-center rounded-full text-[1.1rem] text-linen-dim transition-colors hover:bg-white/[0.06] hover:text-linen"
              >
                <EditIcon />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete collection"
                className="tap-clear inline-flex h-10 w-10 items-center justify-center rounded-full text-[1.1rem] text-linen-dim transition-colors hover:bg-white/[0.06] hover:text-linen"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        )}

        <p className="mt-2.5 text-sm text-linen-dim">
          {artworks.length} {artworks.length === 1 ? 'work' : 'works'}
        </p>
      </header>

      {artworks.length === 0 ? (
        <div className="flex flex-col items-center px-6 pt-20 text-center">
          <p className="font-serif text-xl font-light text-linen">This collection is empty</p>
          <p className="mt-3 max-w-xs text-sm text-linen-dim">
            Open any artwork and use “Add to a collection” to file it here.
          </p>
          <Link
            href="/explore"
            className="mt-7 rounded-full px-5 py-2.5 text-sm text-linen ring-1 ring-white/15 transition-colors hover:ring-white/30"
          >
            Explore the collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 pt-6 sm:grid-cols-3">
          {artworks.map((a) => (
            <div key={a.id} className="group relative">
              <Link href={`/artwork/${a.id}`} className="tap-clear block">
                <div className="art-frame aspect-[4/5] w-full">
                  <ArtworkImage src={a.thumbnail} alt={a.title} className="h-full w-full" />
                </div>
                <div className="px-0.5 pt-3">
                  <h3 className="line-clamp-2 font-serif text-[0.98rem] leading-snug text-linen">
                    {a.title}
                  </h3>
                  <p className="mt-1 truncate text-xs text-linen-faint">{a.artist}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => remove(a.id)}
                aria-label={`Remove ${a.title} from this collection`}
                className="tap-clear absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-[0.95rem] text-linen ring-1 ring-white/10 backdrop-blur-md transition-colors hover:bg-black/65"
              >
                <CloseIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => setConfirmDelete(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="safe-bottom relative mx-auto w-full max-w-sm rounded-t-[1.5rem] bg-gallery-raised p-6 ring-1 ring-white/[0.08] sm:rounded-[1.5rem]"
          >
            <h3 className="font-serif text-xl font-light text-linen">Delete this collection?</h3>
            <p className="mt-2 text-sm leading-relaxed text-linen-dim">
              “{collection.name}” will be removed. The artworks themselves stay in your saved works.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="tap-clear flex-1 rounded-full py-2.5 text-sm text-linen ring-1 ring-white/15 transition-colors hover:ring-white/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={del}
                className="tap-clear flex-1 rounded-full bg-[#c0556b] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<div className="px-6 pt-8" />}>
      <CollectionDetail />
    </Suspense>
  );
}
