'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { searchArtworks, searchArtists } from '@/lib/search';
import { monogram } from '@/lib/format';
import { ArtworkGrid } from '@/components/ArtworkCard';
import { PageHeader } from '@/components/PageHeader';
import { SearchIcon } from '@/components/icons';

const SUGGESTIONS = ['Van Gogh', 'Monet', 'Rembrandt', 'Impressionism', 'Japanese', 'Sculpture'];
const STORE_KEY = 'am:search';

export default function SearchPage() {
  const [query, setQuery] = useState('');

  // Restore the last query so returning from an artwork keeps your results.
  useEffect(() => {
    const saved = sessionStorage.getItem(STORE_KEY);
    if (saved) setQuery(saved);
  }, []);
  useEffect(() => {
    sessionStorage.setItem(STORE_KEY, query);
  }, [query]);

  const artists = useMemo(() => searchArtists(query), [query]);
  const results = useMemo(() => searchArtworks(query), [query]);
  const trimmed = query.trim();
  const nothing = trimmed && artists.length === 0 && results.length === 0;

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
        ) : nothing ? (
          <p className="pt-12 text-center text-linen-faint">No results for “{trimmed}”.</p>
        ) : (
          <>
            {artists.length > 0 && (
              <section className="mb-9">
                <p className="eyebrow mb-4">{artists.length === 1 ? 'Artist' : 'Artists'}</p>
                <div className="flex flex-col gap-1">
                  {artists.map((a) => (
                    <Link
                      key={a.id}
                      href={`/artist/${a.id}`}
                      className="tap-clear -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04]"
                    >
                      {a.portrait ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.portrait}
                          alt={a.name}
                          loading="lazy"
                          className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/[0.07]"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gallery-raised text-xs text-linen-dim ring-1 ring-white/[0.07]">
                          {monogram(a.name)}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[0.98rem] text-linen">{a.name}</span>
                        <span className="block truncate text-xs text-linen-faint">
                          {[a.nationality, a.movement].filter(Boolean).join(' · ') || 'Artist'}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {results.length > 0 && (
              <>
                <p className="eyebrow mb-5">
                  {results.length} {results.length === 1 ? 'work' : 'works'}
                </p>
                <ArtworkGrid artworks={results} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
