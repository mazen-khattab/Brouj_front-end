import ar from "./locales/ar/common.json";
import en from "./locales/en/common.json";
import arErrors from "./locales/ar/errors.json";
import enErrors from "./locales/en/errors.json";
import arAuth from './locales/ar/auth.json';
import enAuth from './locales/en/auth.json';
import arRouting from './locales/ar/routing.json';
import enRouting from './locales/en/routing.json';
import arCatalogue from './locales/ar/catalogue.json';
import enCatalogue from './locales/en/catalogue.json';
import arAccount from './locales/ar/account.json';
import enAccount from './locales/en/account.json';
import arAdmin from './locales/ar/admin.json';
import enAdmin from './locales/en/admin.json';
import arTimePlans from './locales/ar/timePlans.json';
import enTimePlans from './locales/en/timePlans.json';
import arGovernance from './locales/ar/governance.json';
import enGovernance from './locales/en/governance.json';
import arHome from './locales/ar/home.json';
import enHome from './locales/en/home.json';

export const namespaces = [
  "common",
  "home",
  "auth",
  "routing",
  "catalogue",
  "account",
  "admin",
  "timePlans",
  "governance",
  "errors",
] as const;
export type Namespace = (typeof namespaces)[number];

// Feature namespaces are registered now; their keys arrive with their implementation phases.
export const resources = {
  ar: {
    common: ar,
    home: arHome,
    auth: arAuth,
    routing: arRouting,
    catalogue: arCatalogue,
    account: arAccount,
    admin: arAdmin,
    timePlans: arTimePlans,
    governance: arGovernance,
    errors: arErrors,
  },
  en: {
    common: en,
    home: enHome,
    auth: enAuth,
    routing: enRouting,
    catalogue: enCatalogue,
    account: enAccount,
    admin: enAdmin,
    timePlans: enTimePlans,
    governance: enGovernance,
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
