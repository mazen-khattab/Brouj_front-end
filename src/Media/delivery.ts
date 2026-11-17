export interface ApprovedMediaDelivery {
  origin: string;
  /** Supplied only after the owner approves a real identifier-to-URL delivery contract. */
  mapIdentifier: (identifier: string) => string | undefined;
}
export type MediaResolver = (identifier: string) => string | undefined;

export function createMediaResolver(delivery?: ApprovedMediaDelivery): MediaResolver {
  return (identifier) => {
    if (!delivery || !identifier) return undefined;
    try {
      const origin = new URL(delivery.origin);
      if (origin.protocol !== 'https:' || origin.origin !== delivery.origin || origin.username || origin.password) return undefined;
      const mapped = delivery.mapIdentifier(identifier);
      if (!mapped || mapped.includes('\\')) return undefined;
      const url = new URL(mapped);
      if (url.protocol !== 'https:' || url.origin !== origin.origin || url.username || url.password || url.hash || url.pathname === '/') return undefined;
      return url.href;
    } catch { return undefined; }
  };
}
// VITE_MEDIA_ORIGIN alone is not a delivery mapping. No mapping is approved for V1 yet.
export const resolveMedia = createMediaResolver();
