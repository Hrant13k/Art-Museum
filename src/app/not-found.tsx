import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-6xl font-light text-linen-faint">404</p>
      <h1 className="mt-4 font-serif text-2xl font-light text-linen">This gallery is empty</h1>
      <p className="mt-2 max-w-xs text-sm text-linen-dim">
        The work you’re looking for isn’t here.
      </p>
      <Link
        href="/"
        className="mt-7 rounded-full px-5 py-2.5 text-sm text-linen ring-1 ring-white/15 transition-colors hover:ring-white/30"
      >
        Return to today’s artwork
      </Link>
    </div>
  );
}
