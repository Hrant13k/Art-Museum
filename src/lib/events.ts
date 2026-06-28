// A tiny pub/sub so every mounted component stays in sync when on-device user
// data changes. Channels: 'favorites' and 'collections'.
type Channel = 'favorites' | 'collections';

const buses: Record<Channel, Set<() => void>> = {
  favorites: new Set(),
  collections: new Set(),
};

export function subscribe(channel: Channel, fn: () => void): () => void {
  buses[channel].add(fn);
  return () => buses[channel].delete(fn);
}

export function emit(...channels: Channel[]): void {
  for (const channel of channels) buses[channel].forEach((fn) => fn());
}
