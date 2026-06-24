/** Up-to-two-letter initials for an artist avatar, e.g. "Vincent van Gogh" → "VG". */
export function monogram(name: string): string {
  return (
    name
      .replace(/[^A-Za-z ]/g, '')
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '—'
  );
}
