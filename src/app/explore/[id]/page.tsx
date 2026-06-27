import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CATEGORIES, categoryById } from '@/lib/categories';
import { ExhibitionView } from '@/components/ExhibitionView';

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const category = categoryById(id);
  if (!category) return { title: 'Exhibition — Art Museum' };
  return {
    title: `${category.label} — Art Museum`,
    description: `Browse the ${category.label} collection.`,
  };
}

export default async function ExhibitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!categoryById(id)) notFound();
  return <ExhibitionView categoryId={id} />;
}
