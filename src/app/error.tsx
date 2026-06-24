'use client';

import { useEffect } from 'react';

// Route-level error boundary — keeps a single bad render from white-screening the app.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Could be wired to an error reporter later.
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-5xl font-light text-linen-faint">·</p>
      <h1 className="mt-4 font-serif text-2xl font-light text-linen">Something went quiet</h1>
      <p className="mt-2 max-w-xs text-sm text-linen-dim">
        This gallery hit an unexpected problem. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-7 rounded-full px-5 py-2.5 text-sm text-linen ring-1 ring-white/15 transition-colors hover:ring-white/30"
      >
        Try again
      </button>
    </div>
  );
}
