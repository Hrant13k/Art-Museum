'use client';

import { useMemo, useState } from 'react';
import { searchArtworks } from '@/lib/search';
import { ArtworkGrid } from '@/components/ArtworkCard';
import { PageHeader } from '@/components/PageHeader';
import { SearchIcon } from '@/components/icons';

const SUGGESTIONS = ['Van Gogh', 'Monet', 'Rembrandt', 'Impressionism', 'Japanese', 'Sculpture'];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchArtworks(query), [query]);
  const trimmed = query.trim();

  return (
    <div>
      <PageHeader title="Search" />

      <div className="px-6 pt-4">
        <div className="flex items-center gap-3 rounded-2xl bg-gallery-raised px-4 py-3 ring-1 ring-white/[0.06] transition-shadow focus-within:ring-white/20">
          <span className="text-[1.2rem] text-linen-faint">
            <SearchIcon />
          </span>
          <input
            type="search"
            inputMode="search"
            autoComplete="off"
            autoCapitalize="none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, artist, museum, movement…"
            aria-label="Search the collection"
            className="w-full bg-transparent text-base text-linen outline-none placeholder:text-linen-faint"
          />
        </div>
      </div>

      <div className="px-6 pb-10 pt-7">
        {!trimmed ? (
          <div>
            <p className="eyebrow">Try searching for</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="tap-clear rounded-full px-4 py-2 text-sm text-linen-dim ring-1 ring-white/10 transition-colors hover:text-linen hover:ring-white/20"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <p className="pt-12 text-center text-linen-faint">No works found for “{trimmed}”.</p>
        ) : (
          <>
            <p className="eyebrow mb-5">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
            <ArtworkGrid artworks={results} />
          </>
        )}
      </div>
    </div>
  );
}
