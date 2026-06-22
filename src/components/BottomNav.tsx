'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TodayIcon, ExploreIcon, SearchIcon, HeartIcon } from './icons';

const TABS = [
  { href: '/', label: 'Today', Icon: TodayIcon, match: (p: string) => p === '/' },
  { href: '/explore', label: 'Explore', Icon: ExploreIcon, match: (p: string) => p.startsWith('/explore') },
  { href: '/search', label: 'Search', Icon: SearchIcon, match: (p: string) => p.startsWith('/search') },
  { href: '/favorites', label: 'Saved', Icon: HeartIcon, match: (p: string) => p.startsWith('/favorites') },
];

export function BottomNav() {
  const pathname = usePathname() || '/';
  // Hide the tab bar inside the immersive artwork viewer.
  if (pathname.startsWith('/artwork')) return null;

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink/5 bg-paper/85 backdrop-blur-xl"
    >
      <ul className="mx-auto flex w-full max-w-2xl items-stretch justify-around px-2">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className="tap-clear flex flex-col items-center gap-1 py-2.5 text-[1.45rem] transition-colors"
              >
                <span className={active ? 'text-ink' : 'text-ink-faint'}>
                  <Icon filled={active && label === 'Saved'} />
                </span>
                <span
                  className={`text-[0.65rem] tracking-wide ${active ? 'text-ink' : 'text-ink-faint'}`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
