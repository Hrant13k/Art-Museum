import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { museums, getMuseum, getArtworksByIds } from '@/lib/db';
import { ArtworkGrid } from '@/components/ArtworkCard';
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
  const featured = works.slice(0, 6);

  return (
    <div className="px-5 pb-10">
      <div className="safe-top pt-6">
        <BackButton />
      </div>

      <header className="mt-6">
        <h1 className="font-serif text-3xl leading-tight text-ink">{museum.name}</h1>
        <p className="mt-1.5 text-ink-faint">{museum.location}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-faint">
          {museum.foundedYear && <span>Founded {museum.foundedYear}</span>}
          <span>
            {works.length} {works.length === 1 ? 'work' : 'works'} in collection
          </span>
        </div>
      </header>

      {museum.history && (
        <p className="mt-6 max-w-reading leading-relaxed text-ink-soft">{museum.history}</p>
      )}

      {museum.mapUrl && (
        <a
          href={museum.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent underline-offset-2 hover:underline"
        >
          View on map ↗
        </a>
      )}

      <section className="mt-9">
        <h2 className="mb-4 font-serif text-lg text-ink">Featured works</h2>
        <ArtworkGrid artworks={featured} />
      </section>

      {works.length > featured.length && (
        <section className="mt-10">
          <h2 className="mb-4 font-serif text-lg text-ink">More from this museum</h2>
          <ArtworkGrid artworks={works.slice(6)} />
        </section>
      )}
    </div>
  );
}
