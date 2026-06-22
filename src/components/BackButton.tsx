'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from './icons';

export function BackButton({ label = 'Back' }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="tap-clear inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink"
    >
      <ArrowLeftIcon className="text-[1.1rem]" />
      {label}
    </button>
  );
}
