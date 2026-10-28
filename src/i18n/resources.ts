import ar from "./locales/ar/common.json";
import en from "./locales/en/common.json";
import arErrors from "./locales/ar/errors.json";
import enErrors from "./locales/en/errors.json";
import arAuth from './locales/ar/auth.json';
import enAuth from './locales/en/auth.json';

export const namespaces = [
  "common",
  "auth",
  "catalogue",
  "account",
  "admin",
  "timePlans",
  "errors",
] as const;
export type Namespace = (typeof namespaces)[number];

// Feature namespaces are registered now; their keys arrive with their implementation phases.
export const resources = {
  ar: {
    common: ar,
    auth: arAuth,
    catalogue: {},
    account: {},
    admin: {},
    timePlans: {},
    errors: arErrors,
  },
  en: {
    common: en,
    auth: enAuth,
    catalogue: {},
    account: {},
    admin: {},
    timePlans: {},
    errors: enErrors,
  },
};

export interface TranslationMessage {
  key: string;
  namespace?: Namespace;
  values?: Record<string, string | number>;
}

function leafKeys(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") {
    if (!value.trim()) throw new Error(`Empty translation: ${prefix}`);
    return [prefix];
  }
  if (!value || typeof value !== "object")
    throw new Error(`Invalid translation: ${prefix}`);
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

/** Runtime fallback is useful, but must never hide missing release translations from verification. */
export function translationGaps(left: unknown, right: unknown): string[] {
  const first = new Set(leafKeys(left));
  const second = new Set(leafKeys(right));
  return [...new Set([...first, ...second])]
    .filter((key) => !first.has(key) || !second.has(key))
    .sort();
}
