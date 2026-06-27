import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { artists, getArtist, getArtworksByIds } from '@/lib/db';
import { monogram } from '@/lib/format';
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
  const meta = [artist.nationality, artist.movement].filter(Boolean).join(' · ');

  return (
    <div className="px-6 pb-12">
      <div className="safe-top pt-7">
        <BackButton />
      </div>

      <header className="mt-8 flex items-center gap-5">
        <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gallery-raised ring-1 ring-white/[0.07]">
          {artist.portrait ? (
            <ArtworkImage src={artist.portrait} alt={artist.name} className="h-full w-full" />
          ) : (
            <span className="font-serif text-2xl text-linen-dim">{monogram(artist.name)}</span>
          )}
        </div>
        <div className="min-w-0">
          {meta && <p className="eyebrow mb-1.5 text-gilt/90">{meta}</p>}
          <h1 className="font-serif text-[1.9rem] font-light leading-tight tracking-tight text-linen">
            {artist.name}
          </h1>
          {life && <p className="mt-1 text-sm text-linen-faint">{life}</p>}
        </div>
      </header>

      {artist.bio ? (
        <p className="mt-7 max-w-reading text-[1.02rem] leading-[1.75] text-linen-dim">{artist.bio}</p>
      ) : (
        <p className="mt-7 border-l-2 border-gilt/40 pl-3 text-sm text-linen-faint">
          A biography for this artist is not yet available.
        </p>
      )}

      {artist.influencedBy && artist.influencedBy.length > 0 && (
        <p className="mt-5 text-sm text-linen-faint">
          <span className="text-linen-dim">Influenced by</span> {artist.influencedBy.join(', ')}
        </p>
      )}

      <section className="mt-10">
        <div className="mb-5 flex items-baseline gap-3">
          <h2 className="eyebrow">In the collection</h2>
          <span className="text-xs text-linen-faint">{works.length}</span>
        </div>
        <ArtworkGrid artworks={works} />
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="eyebrow mb-4">Related artists</h2>
          <div className="flex flex-wrap gap-2.5">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/artist/${r.id}`}
                className="rounded-full px-4 py-2 text-sm text-linen-dim ring-1 ring-white/10 transition-colors hover:text-linen hover:ring-white/20"
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
