import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { museums, getMuseum, getArtworksByIds } from '@/lib/db';
import { ArtworkGrid } from '@/components/ArtworkCard';
import { ArtworkImage } from '@/components/ArtworkImage';
import { BackButton } from '@/components/BackButton';

export function generateStaticParams() {
  return museums.map((m) => ({ id: m.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const museum = getMuseum(id);
  return { title: museum ? `${museum.name} — Art Museum` : 'Museum — Art Museum' };
}

export default async function MuseumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const museum = getMuseum(id);
  if (!museum) notFound();

  const works = getArtworksByIds(museum.artworkIds);
  const cover = works[0];
  const rest = works.slice(1);

  return (
    <div className="pb-12">
      {/* Hero */}
      <section className="relative">
        {cover && (
          <div className="relative h-[44vh] min-h-[300px] w-full overflow-hidden">
            <ArtworkImage src={cover.thumbnail} alt={museum.name} priority fit="cover" className="h-full w-full" />
            <div className="pointer-events-none absolute inset-0 scrim-b" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 scrim-t" />
          </div>
        )}
        <div className="safe-top absolute inset-x-0 top-0 px-6 pt-7">
          <BackButton />
        </div>
        <div className={cover ? 'absolute inset-x-0 bottom-0 px-6 pb-6' : 'px-6 pt-10'}>
          <p className="eyebrow text-gilt/90">Museum</p>
          <h1 className="mt-2 font-serif text-[2.2rem] font-light leading-[1.05] tracking-tight text-linen">
            {museum.name}
          </h1>
          <p className="mt-2 text-sm text-linen-dim">{museum.location}</p>
        </div>
      </section>

      <div className="px-6">
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-y border-white/[0.07] py-4 text-sm text-linen-dim">
          {museum.foundedYear && (
            <span>
              <span className="text-linen-faint">Founded</span> {museum.foundedYear}
            </span>
          )}
          <span>
            <span className="text-linen-faint">Works</span> {works.length}
          </span>
        </div>

        {museum.history && (
          <p className="mt-6 max-w-reading text-[1.02rem] leading-[1.75] text-linen-dim">
            {museum.history}
          </p>
        )}

        {museum.mapUrl && (
          <a
            href={museum.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-gilt underline-offset-4 transition-colors hover:underline"
          >
            View on map ↗
          </a>
        )}

        <section className="mt-10">
          <h2 className="eyebrow mb-5">Works in this collection</h2>
          <ArtworkGrid artworks={rest.length ? [cover, ...rest] : works} />
        </section>
      </div>
    </div>
  );
}
