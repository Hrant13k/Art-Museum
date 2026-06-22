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

      <div className="px-5 pt-3">
        <div className="flex items-center gap-2 rounded-full border border-ink/15 bg-paper-dim px-4 py-2.5 focus-within:border-ink/40">
          <span className="text-[1.2rem] text-ink-faint">
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
            className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-ghost"
          />
        </div>
      </div>

      <div className="px-5 pb-8 pt-6">
        {!trimmed ? (
          <div>
            <p className="text-sm text-ink-faint">Try searching for</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="tap-clear rounded-full border border-ink/15 px-4 py-1.5 text-sm text-ink-soft hover:border-ink/30"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <p className="pt-10 text-center text-ink-faint">
            No works found for “{trimmed}”.
          </p>
        ) : (
          <>
            <p className="mb-5 text-xs text-ink-ghost">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
            <ArtworkGrid artworks={results} />
          </>
        )}
      </div>
    </div>
  );
}
