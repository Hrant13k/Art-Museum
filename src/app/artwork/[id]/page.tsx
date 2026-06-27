import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { artworks, getArtwork } from '@/lib/db';
import { getArtworkDetail } from '@/lib/db.server';
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
  // Pass the entry artwork's detail as a prop so it is part of this page's
  // static HTML (instant, SEO-friendly) rather than the shared client bundle.
  return <ArtworkViewer startId={id} initialDetail={getArtworkDetail(id)} />;
}
