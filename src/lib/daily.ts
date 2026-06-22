import type { Artwork } from '@/types/artwork';
import { artworks } from './db';

/** Day index since epoch — same for everyone on a given calendar day. */
function dayNumber(date = new Date()): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
}

/** The artwork of the day — deterministic, rotates once per day. */
export function dailyArtwork(date = new Date()): Artwork {
  if (artworks.length === 0) throw new Error('No artworks in collection.');
  return artworks[dayNumber(date) % artworks.length];
}

/** A stable, human-readable date label, e.g. "Monday, 22 June 2026". */
export function todayLabel(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
