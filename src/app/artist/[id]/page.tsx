import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { artists, getArtist, getArtworksByIds } from '@/lib/db';
import { ArtworkGrid } from '@/components/ArtworkCard';
import { BackButton } from '@/components/BackButton';
import { ArtworkImage } from '@/components/ArtworkImage';

export function generateStaticParams() {
  return artists.map((a) => ({ id: a.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const artist = getArtist(id);
  return { title: artist ? `${artist.name} — Art Museum` : 'Artist — Art Museum' };
}

function lifespan(birth: string | null, death: string | null): string | null {
  if (!birth && !death) return null;
  return `${birth ?? '?'}–${death ?? 'present'}`;
}

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = getArtist(id);
  if (!artist) notFound();

  const works = getArtworksByIds(artist.artworkIds);
  const related = artist.relatedArtistIds
    .map((rid) => getArtist(rid))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const life = lifespan(artist.birthYear, artist.deathYear);
  const monogram = artist.name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="px-5 pb-10">
      <div className="safe-top pt-6">
        <BackButton />
      </div>

      <header className="mt-6 flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper-deep">
          {artist.portrait ? (
            <ArtworkImage src={artist.portrait} alt={artist.name} className="h-full w-full" />
          ) : (
            <span className="font-serif text-2xl text-ink-faint">{monogram || '—'}</span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-serif text-2xl leading-tight text-ink">{artist.name}</h1>
          <p className="mt-1 text-sm text-ink-faint">
            {[artist.nationality, artist.movement].filter(Boolean).join(' · ')}
            {life ? (artist.nationality || artist.movement ? ` · ${life}` : life) : ''}
          </p>
        </div>
      </header>

      {artist.bio ? (
        <p className="mt-6 max-w-reading leading-relaxed text-ink-soft">{artist.bio}</p>
      ) : (
        <p className="mt-6 rounded-lg bg-paper-dim px-3 py-2 text-sm text-ink-faint">
          A biography for this artist is not yet available.
        </p>
      )}

      <section className="mt-9">
        <h2 className="mb-4 font-serif text-lg text-ink">
          In the collection
          <span className="ml-2 text-sm font-normal text-ink-ghost">{works.length}</span>
        </h2>
        <ArtworkGrid artworks={works} />
      </section>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-serif text-lg text-ink">Related artists</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/artist/${r.id}`}
                className="rounded-full border border-ink/15 px-4 py-1.5 text-sm text-ink-soft hover:border-ink/30"
              >
                {r.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
