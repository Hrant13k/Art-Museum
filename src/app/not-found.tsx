import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-5xl text-ink-ghost">404</p>
      <h1 className="mt-4 font-serif text-2xl text-ink">This gallery is empty</h1>
      <p className="mt-2 max-w-xs text-sm text-ink-faint">
        The work you’re looking for isn’t here.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full border border-ink/20 px-5 py-2 text-sm text-ink hover:border-ink/40"
      >
        Return to today’s artwork
      </Link>
    </div>
  );
}
