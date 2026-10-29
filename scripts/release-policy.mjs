import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

/** Release inputs are explicit process values; local development dotenv files are not approval. */
export function releaseInputs(env, rehearsal = false) {
  if (env.VITE_API_ORIGIN !== 'https://api.brouj.com') {
    throw new Error('Set VITE_API_ORIGIN explicitly to https://api.brouj.com.');
  }
  const currency = env.VITE_BUSINESS_CURRENCY;
  if (!currency || !Intl.supportedValuesOf('currency').includes(currency)) {
    throw new Error('Set an explicit supported VITE_BUSINESS_CURRENCY. Rehearsal currency is illustrative only.');
  }
  if (env.VITE_MEDIA_ORIGIN) {
    throw new Error('A media origin alone is not an approved identifier mapping. This release boundary supports placeholders only.');
  }
  if (!rehearsal && (!env.BROUJ_CURRENCY_APPROVAL_REFERENCE?.trim() || !env.BROUJ_MEDIA_APPROVAL_REFERENCE?.trim())) {
    throw new Error('Release packaging requires owner approval references for business currency and placeholder media disposition.');
  }
  return {
    frontendOrigin: 'https://brouj.com', apiOrigin: env.VITE_API_ORIGIN, businessCurrency: currency,
    mediaDisposition: 'placeholders', rehearsal,
    currencyApproval: rehearsal ? null : env.BROUJ_CURRENCY_APPROVAL_REFERENCE,
    mediaApproval: rehearsal ? null : env.BROUJ_MEDIA_APPROVAL_REFERENCE,
  };
}

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

/** Hash each regular file in a new artifact. Never package source, secrets or local configuration. */
export function artifactFiles(directory) {
  function walk(current) {
    return readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
      const path = resolve(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error('Release artifacts cannot contain symbolic links.');
      }
      if (entry.isDirectory()) {
        return walk(path);
      }
      if (!entry.isFile()) {
        throw new Error('Release artifacts must contain regular files only.');
      }
      const bytes = readFileSync(path);
      return [{ path: relative(directory, path).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) }];
    });
  }

  return walk(directory).sort((a, b) => a.path.localeCompare(b.path, 'en'));
}
