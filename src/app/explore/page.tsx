'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '@/lib/categories';
import { artworksInCategory, getArtwork } from '@/lib/db';
import { COVERS } from '@/lib/covers';
import { CollectionTicket } from '@/components/CollectionTicket';
import { ComingSoonTicket } from '@/components/ComingSoonTicket';
import { PageHeader } from '@/components/PageHeader';

// A couple of categories read better as named "exhibitions" on their pass.
const TITLE_OVERRIDE: Record<string, string> = {
  all: 'The Complete Collection',
  random: 'Random Discoveries',
};

export default function ExplorePage() {
  const collections = useMemo(() => {
    const visible = CATEGORIES.filter(
      (c) => c.comingSoon || c.id === 'all' || c.id === 'random' || artworksInCategory(c).length > 0,
    );
    // Give each ticket a distinct face: walk in order and pick the first work an
    // earlier ticket hasn't already claimed (some works match several
    // collections). Deterministic, so prerender and client agree.
    const used = new Set<string>();
    // Curated covers take precedence; reserve them so the dedup fallback below
    // never re-uses a hand-picked work on another ticket.
    for (const c of Object.values(COVERS)) used.add(c.id);
    const pickFace = (works: ReturnType<typeof artworksInCategory>, from = 0) => {
      for (let i = from; i < works.length; i++) {
        if (!used.has(works[i].id)) {
          used.add(works[i].id);
          return works[i];
        }
      }
      for (let i = 0; i < works.length; i++) {
        if (!used.has(works[i].id)) {
          used.add(works[i].id);
          return works[i];
        }
      }
      return works[from] ?? works[0];
    };

    let plate = 0; // plate numbers count only the real exhibitions
    return visible.map((c) => {
      if (c.comingSoon) {
        return { kind: 'soon' as const, id: c.id, label: c.label };
      }
      const works = artworksInCategory(c);
      plate += 1;

      // Prefer a hand-curated cover with a focal-point crop; otherwise fall back
      // to a deterministic, de-duplicated pick from the collection's works.
      const curated = COVERS[c.id];
      const curatedArt = curated ? getArtwork(curated.id) : null;
      const face = curatedArt
        ? null
        : pickFace(works, c.id === 'random' ? Math.floor(works.length / 2) : 0);

      return {
        kind: 'ticket' as const,
        id: c.id,
        index: plate,
        label: TITLE_OVERRIDE[c.id] ?? c.label,
        count: works.length,
        image: curatedArt?.thumbnail ?? face?.thumbnail,
        alt: curatedArt?.title ?? face?.title,
        objectPosition: curatedArt ? curated?.position : undefined,
        zoom: curatedArt ? curated?.zoom : undefined,
      };
    });
  }, []);

  return (
    <div>
      <PageHeader eyebrow="Admit one" title="Explore" />
      <p className="px-6 pb-1 pt-2 text-sm text-linen-dim">
        Tear a pass to step into an exhibition.
      </p>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
        className="flex flex-col gap-5 px-6 pb-12 pt-5"
      >
        {collections.map((c) => (
          <motion.div
            key={c.id}
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
            }}
          >
            {c.kind === 'soon' ? (
              <ComingSoonTicket id={c.id} label={c.label} />
            ) : (
              <CollectionTicket
                id={c.id}
                index={c.index}
                label={c.label}
                count={c.count}
                image={c.image}
                alt={c.alt}
                objectPosition={c.objectPosition}
                zoom={c.zoom}
                priority={c.index <= 2}
              />
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
