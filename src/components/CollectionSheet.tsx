'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCollections } from '@/lib/useCollections';
import { getCollectionsForArtwork, toggleInCollection, addToCollection } from '@/lib/collections';
import { emit } from '@/lib/events';
import { CheckIcon, CloseIcon, PlusIcon } from './icons';

type Props = { artworkId: string; open: boolean; onClose: () => void };

const ease = [0.22, 1, 0.36, 1] as const;

export function CollectionSheet({ artworkId, open, onClose }: Props) {
  const { collections, counts, createCollection } = useCollections();
  const [member, setMember] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Load which collections already hold this artwork whenever the sheet opens.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    getCollectionsForArtwork(artworkId).then((ids) => alive && setMember(new Set(ids)));
    setCreating(false);
    setName('');
    return () => {
      alive = false;
    };
  }, [open, artworkId]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const toggle = async (collectionId: string) => {
    const nowIn = await toggleInCollection(collectionId, artworkId);
    setMember((prev) => {
      const next = new Set(prev);
      if (nowIn) next.add(collectionId);
      else next.delete(collectionId);
      return next;
    });
    emit('collections', 'favorites');
  };

  const submitNew = async () => {
    const created = await createCollection(name);
    if (created) {
      await addToCollection(created.id, artworkId);
      setMember((prev) => new Set(prev).add(created.id));
      emit('collections', 'favorites');
    }
    setName('');
    setCreating(false);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Add to a collection"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.42, ease }}
            className="safe-bottom absolute inset-x-0 bottom-0 mx-auto max-w-2xl rounded-t-[1.75rem] bg-gallery-raised ring-1 ring-white/[0.08]"
          >
            {/* grabber + header */}
            <div className="flex flex-col items-center pt-3">
              <span className="h-1 w-10 rounded-full bg-white/15" />
            </div>
            <div className="flex items-center justify-between px-6 pb-2 pt-4">
              <h2 className="font-serif text-xl font-light text-linen">Add to a collection</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="tap-clear inline-flex h-9 w-9 items-center justify-center rounded-full text-linen-dim transition-colors hover:bg-white/[0.06] hover:text-linen"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-3 pb-6">
              {/* New collection */}
              {creating ? (
                <div className="mx-3 mb-2 mt-1 flex items-center gap-2 rounded-2xl bg-gallery px-3 py-2 ring-1 ring-white/10 focus-within:ring-gilt/40">
                  <input
                    ref={inputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitNew();
                    }}
                    maxLength={60}
                    placeholder="Collection name"
                    className="w-full bg-transparent py-1.5 text-[0.98rem] text-linen outline-none placeholder:text-linen-faint"
                  />
                  <button
                    type="button"
                    onClick={submitNew}
                    disabled={!name.trim()}
                    className="tap-clear shrink-0 rounded-full bg-linen px-4 py-1.5 text-sm font-medium text-gallery transition-opacity disabled:opacity-40"
                  >
                    Create
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="tap-clear flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-gilt ring-1 ring-dashed ring-gilt/40">
                    <PlusIcon />
                  </span>
                  <span className="text-[0.98rem] text-linen">New collection</span>
                </button>
              )}

              {/* Existing collections */}
              {collections.map((c) => {
                const inIt = member.has(c.id);
                const count = counts[c.id] ?? 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    aria-pressed={inIt}
                    className="tap-clear flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gallery text-sm text-linen-faint ring-1 ring-white/[0.07]">
                      {count}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.98rem] text-linen">{c.name}</span>
                      <span className="block text-xs text-linen-faint">
                        {count} {count === 1 ? 'work' : 'works'}
                      </span>
                    </span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.9rem] transition-colors ${
                        inIt ? 'bg-gilt text-gallery' : 'text-transparent ring-1 ring-white/20'
                      }`}
                    >
                      <CheckIcon />
                    </span>
                  </button>
                );
              })}

              {collections.length === 0 && !creating && (
                <p className="px-3 pb-2 pt-3 text-center text-sm text-linen-faint">
                  Create your first collection to start curating.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
