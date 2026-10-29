interface PublicEnvironment {
  readonly MODE?: string;
  readonly VITE_API_ORIGIN?: string;
  readonly VITE_MEDIA_ORIGIN?: string;
  readonly VITE_BUSINESS_CURRENCY?: string;
}

/** Accept an HTTPS origin only: credentials, paths, queries, and fragments are invalid. */
function httpsOrigin(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTPS origin.`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${name} must be an HTTPS origin without credentials, path, query, or fragment.`);
  }
  return url.origin;
}

/** Only explicitly named public inputs enter application configuration. */
export function readEnvironment(input: PublicEnvironment) {
  const production = input.MODE === 'production';
  const apiOrigin = httpsOrigin(input.VITE_API_ORIGIN ?? (production ? 'https://api.brouj.com' : 'https://localhost:7249'), 'VITE_API_ORIGIN');
  const mediaOrigin = input.VITE_MEDIA_ORIGIN?.trim();
  const currency = input.VITE_BUSINESS_CURRENCY?.trim();
  if (currency && !Intl.supportedValuesOf('currency').includes(currency)) {
    throw new Error('VITE_BUSINESS_CURRENCY must be a supported uppercase ISO 4217 currency code.');
  }
  return Object.freeze({
    apiOrigin,
    mediaOrigin: mediaOrigin ? httpsOrigin(mediaOrigin, 'VITE_MEDIA_ORIGIN') : undefined,
    businessCurrency: currency || undefined,
  });
}

// Static property access keeps unrelated VITE_* inputs out of the compiled environment object.
export const environment = readEnvironment({
  MODE: import.meta.env.MODE,
  VITE_API_ORIGIN: import.meta.env.VITE_API_ORIGIN,
  VITE_MEDIA_ORIGIN: import.meta.env.VITE_MEDIA_ORIGIN,
  VITE_BUSINESS_CURRENCY: import.meta.env.VITE_BUSINESS_CURRENCY,
});
