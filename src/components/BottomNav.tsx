'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { TodayIcon, ExploreIcon, SearchIcon, HeartIcon } from './icons';

const TABS = [
  { href: '/', label: 'Today', Icon: TodayIcon, match: (p: string) => p === '/' },
  { href: '/explore', label: 'Explore', Icon: ExploreIcon, match: (p: string) => p.startsWith('/explore') },
  { href: '/search', label: 'Search', Icon: SearchIcon, match: (p: string) => p.startsWith('/search') },
  { href: '/favorites', label: 'Saved', Icon: HeartIcon, match: (p: string) => p.startsWith('/favorites') || p.startsWith('/collection') },
];

export function BottomNav() {
  const pathname = usePathname() || '/';
  // Hide the tab bar inside the immersive artwork viewer.
  if (pathname.startsWith('/artwork')) return null;

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-gallery/80 backdrop-blur-2xl"
    >
      <ul className="mx-auto flex w-full max-w-2xl items-stretch justify-around px-2">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className="tap-clear relative flex flex-col items-center gap-1.5 pb-2 pt-3 text-[1.4rem]"
              >
                <span className={active ? 'text-linen' : 'text-linen-faint'}>
                  <Icon filled={active && label === 'Saved'} />
                </span>
                <span
                  className={`text-[0.62rem] tracking-wide ${active ? 'text-linen' : 'text-linen-faint'}`}
                >
                  {label}
                </span>
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute -top-px h-[2px] w-7 rounded-full bg-gilt"
                    transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
