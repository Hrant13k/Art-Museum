import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { artworks, getArtwork } from '@/lib/db';
import { ArtworkViewer } from '@/components/ArtworkViewer';

export function generateStaticParams() {
  return artworks.map((a) => ({ id: a.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const artwork = getArtwork(id);
  if (!artwork) return { title: 'Artwork — Art Museum' };
  return {
    title: `${artwork.title} — ${artwork.artist}`,
    description: artwork.overview,
  };
}

export default async function ArtworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getArtwork(id)) notFound();
  return <ArtworkViewer startId={id} />;
}
